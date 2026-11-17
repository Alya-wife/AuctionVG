<?php
/**
 * LeagueController - NitipPro Vanguard Tournament League & Point Ranking
 * 
 * Mengelola sistem liga turnamen mingguan:
 * - Poin Turnamen: 1st=10, 2nd=8, 3rd=6, 4th=5, 5-6th=4, 7-8th=3, 9th+=2
 * - Input hasil turnamen per minggu
 * - Rekap bulanan & akumulasi poin Minggu 1 - 4+
 * - Perhitungan pergerakan naik/turun peringkat (trend panah)
 */

require_once __DIR__ . '/BaseController.php';

class LeagueController extends BaseController {

    private static $tablesEnsured = false;

    private function ensureTables() {
        if (self::$tablesEnsured) {
            return;
        }
        try {
            $this->pdo->exec("CREATE TABLE IF NOT EXISTS `league_tournaments` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `title` VARCHAR(255) NOT NULL,
                `tournament_date` DATE NOT NULL,
                `year` INT NOT NULL,
                `month` INT NOT NULL,
                `week` INT NOT NULL DEFAULT 1,
                `notes` TEXT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_year_month` (`year`, `month`),
                INDEX `idx_week` (`week`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            $this->pdo->exec("CREATE TABLE IF NOT EXISTS `league_scores` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `tournament_id` INT NOT NULL,
                `player_name` VARCHAR(150) NOT NULL,
                `rank_position` INT NOT NULL,
                `points` INT NOT NULL,
                `notes` VARCHAR(255) NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_tournament` (`tournament_id`),
                INDEX `idx_player` (`player_name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            $this->pdo->exec("CREATE TABLE IF NOT EXISTS `league_players` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(150) NOT NULL UNIQUE,
                `phone` VARCHAR(50) NULL,
                `notes` VARCHAR(255) NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            $this->pdo->exec("CREATE TABLE IF NOT EXISTS `league_settings` (
                `setting_key` VARCHAR(100) NOT NULL PRIMARY KEY,
                `setting_value` TEXT NOT NULL,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            // Tabel pencairan / klaim hadiah pemain (tombol minus untuk pengurangan uang hadiah)
            $this->pdo->exec("CREATE TABLE IF NOT EXISTS `league_prize_claims` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `year` INT NOT NULL,
                `season` INT NOT NULL,
                `rank_position` INT NOT NULL,
                `player_name` VARCHAR(150) NOT NULL,
                `amount_claimed` INT NOT NULL,
                `notes` VARCHAR(255) NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_year_season` (`year`, `season`),
                INDEX `idx_player` (`player_name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

            // Tambahkan kolom prize di league_tournaments jika belum ada
            try {
                $checkCols = $this->pdo->query("SHOW COLUMNS FROM `league_tournaments` LIKE 'entry_fee'")->fetchAll();
                if (empty($checkCols)) {
                    $this->pdo->exec("ALTER TABLE `league_tournaments` 
                        ADD COLUMN `entry_fee` INT NOT NULL DEFAULT 10000 AFTER `week`,
                        ADD COLUMN `prize_cut` INT NOT NULL DEFAULT 0 AFTER `entry_fee`,
                        ADD COLUMN `prize_cut_note` VARCHAR(255) NULL DEFAULT '' AFTER `prize_cut`,
                        ADD COLUMN `prize_pct_1` INT NOT NULL DEFAULT 50 AFTER `prize_cut_note`,
                        ADD COLUMN `prize_pct_2` INT NOT NULL DEFAULT 30 AFTER `prize_pct_1`,
                        ADD COLUMN `prize_pct_3` INT NOT NULL DEFAULT 20 AFTER `prize_pct_2`;");
                }
            } catch (\Exception $exCol) {}
        } catch (\Exception $e) {
            // Ignore if tables already exist or permissions error
        }
        self::$tablesEnsured = true;
    }

    /**
     * Mengambil aturan pembagian poin tersimpan (atau default)
     */
    public function getPointRules() {
        $this->ensureTables();
        $defaultRules = [
            'rank_1'      => 10,
            'rank_2'      => 8,
            'rank_3'      => 6,
            'rank_4'      => 5,
            'rank_5_6'    => 4,
            'rank_7_8'    => 3,
            'rank_9_plus' => 2
        ];
        try {
            $stmt = $this->pdo->prepare("SELECT setting_value FROM league_settings WHERE setting_key = 'point_rules'");
            $stmt->execute();
            $val = $stmt->fetchColumn();
            if ($val) {
                $decoded = json_decode($val, true);
                if (is_array($decoded)) {
                    $defaultRules = array_merge($defaultRules, $decoded);
                }
            }
        } catch (\Exception $e) {}
        return $defaultRules;
    }

    public function getPointRulesApi() {
        $this->jsonSuccess($this->getPointRules());
    }

    /**
     * Simpan perubahan aturan poin (Edit Poin)
     */
    public function savePointRules($payload = []) {
        $this->ensureTables();
        $rules = [
            'rank_1'      => max(0, (int)($payload['rank_1'] ?? 10)),
            'rank_2'      => max(0, (int)($payload['rank_2'] ?? 8)),
            'rank_3'      => max(0, (int)($payload['rank_3'] ?? 6)),
            'rank_4'      => max(0, (int)($payload['rank_4'] ?? 5)),
            'rank_5_6'    => max(0, (int)($payload['rank_5_6'] ?? 4)),
            'rank_7_8'    => max(0, (int)($payload['rank_7_8'] ?? 3)),
            'rank_9_plus' => max(0, (int)($payload['rank_9_plus'] ?? 2)),
        ];

        try {
            $stmt = $this->pdo->prepare("INSERT INTO league_settings (setting_key, setting_value) 
                VALUES ('point_rules', ?) 
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $stmt->execute([json_encode($rules)]);
            $this->jsonSuccess($rules);
        } catch (\Exception $e) {
            $this->jsonError('Gagal menyimpan aturan poin: ' . $e->getMessage());
        }
    }

    /**
     * Hitung poin berdasarkan peringkat sesuai aturan turnamen
     */
    public function calculatePoints($rank, $rules = null) {
        if (!$rules) {
            $rules = $this->getPointRules();
        }
        $r = (int)$rank;
        if ($r === 1) return (int)($rules['rank_1'] ?? 10);
        if ($r === 2) return (int)($rules['rank_2'] ?? 8);
        if ($r === 3) return (int)($rules['rank_3'] ?? 6);
        if ($r === 4) return (int)($rules['rank_4'] ?? 5);
        if ($r === 5 || $r === 6) return (int)($rules['rank_5_6'] ?? 4);
        if ($r === 7 || $r === 8) return (int)($rules['rank_7_8'] ?? 3);
        if ($r >= 9) return (int)($rules['rank_9_plus'] ?? 2);
        return 0;
    }

    /**
     * Mengambil data leaderboard & rekap bulanan serta daftar turnamen
     */
    public function getLeagueData($payload = []) {
        $this->ensureTables();

        try {
            $currentYear  = (int)date('Y');
            $currentMonth = (int)date('m');

            $year  = !empty($payload['year']) ? (int)$payload['year'] : $currentYear;
            $month = !empty($payload['month']) ? (int)$payload['month'] : $currentMonth;

            // 1. Ambil semua turnamen di bulan & tahun terpilih
            $tStmt = $this->pdo->prepare("SELECT 
                t.*,
                (SELECT COUNT(*) FROM league_scores s WHERE s.tournament_id = t.id) AS player_count
            FROM league_tournaments t
            WHERE t.year = ? AND t.month = ?
            ORDER BY t.week ASC, t.tournament_date ASC, t.id ASC");
            $tStmt->execute([$year, $month]);
            $tournaments = $tStmt->fetchAll(PDO::FETCH_ASSOC);

            // 2. Ambil semua skor di bulan & tahun terpilih
            $sStmt = $this->pdo->prepare("SELECT 
                s.tournament_id,
                s.player_name,
                s.rank_position,
                s.points,
                t.week,
                t.tournament_date
            FROM league_scores s
            JOIN league_tournaments t ON s.tournament_id = t.id
            WHERE t.year = ? AND t.month = ?
            ORDER BY t.week ASC, s.rank_position ASC");
            $sStmt->execute([$year, $month]);
            $allScores = $sStmt->fetchAll(PDO::FETCH_ASSOC);

            // Tentukan minggu maksimal yang ada datanya
            $weeksPlayed = [];
            foreach ($tournaments as $t) {
                $w = (int)$t['week'];
                if (!in_array($w, $weeksPlayed)) {
                    $weeksPlayed[] = $w;
                }
            }
            sort($weeksPlayed);
            $latestWeek = !empty($weeksPlayed) ? end($weeksPlayed) : 0;
            $previousWeek = count($weeksPlayed) > 1 ? $weeksPlayed[count($weeksPlayed) - 2] : 0;

            // 3. Kelompokkan skor berdasarkan player (menggunakan lowercase key untuk normalisasi nama)
            $playerMap = [];
            foreach ($allScores as $sc) {
                $pName = trim($sc['player_name']);
                if ($pName === '') continue;
                $pKey = strtolower($pName);

                if (!isset($playerMap[$pKey])) {
                    $playerMap[$pKey] = [
                        'name'               => $pName,
                        'total_points'       => 0,
                        'played_count'       => 0,
                        'weeks'              => [
                            1 => ['points' => 0, 'rank' => null],
                            2 => ['points' => 0, 'rank' => null],
                            3 => ['points' => 0, 'rank' => null],
                            4 => ['points' => 0, 'rank' => null],
                            5 => ['points' => 0, 'rank' => null]
                        ],
                        'points_up_to_prev'  => 0,
                        'played_up_to_prev'  => 0,
                        'best_rank'          => 999
                    ];
                }

                $w = (int)$sc['week'];
                $pts = (int)$sc['points'];
                $pos = (int)$sc['rank_position'];

                if ($w >= 1 && $w <= 5) {
                    $playerMap[$pKey]['weeks'][$w]['points'] += $pts;
                    // Simpan peringkat terbaik jika main lebih dari 1x di minggu yg sama
                    if ($playerMap[$pKey]['weeks'][$w]['rank'] === null || $pos < $playerMap[$pKey]['weeks'][$w]['rank']) {
                        $playerMap[$pKey]['weeks'][$w]['rank'] = $pos;
                    }
                }

                $playerMap[$pKey]['total_points'] += $pts;
                $playerMap[$pKey]['played_count'] += 1;
                if ($pos < $playerMap[$pKey]['best_rank']) {
                    $playerMap[$pKey]['best_rank'] = $pos;
                }

                // Hitung poin sebelum minggu terakhir (untuk trend pergerakan peringkat)
                if ($previousWeek > 0 && $w <= $previousWeek) {
                    $playerMap[$pKey]['points_up_to_prev'] += $pts;
                    $playerMap[$pKey]['played_up_to_prev'] += 1;
                }
            }

            // 4. Hitung peringkat sebelum minggu terakhir (Previous Standings)
            $prevStandings = [];
            if ($previousWeek > 0) {
                foreach ($playerMap as $pKey => $pData) {
                    if ($pData['played_up_to_prev'] > 0) {
                        $prevStandings[] = [
                            'key'    => $pKey,
                            'name'   => $pData['name'],
                            'points' => $pData['points_up_to_prev'],
                            'played' => $pData['played_up_to_prev']
                        ];
                    }
                }
                usort($prevStandings, function($a, $b) {
                    if ($b['points'] !== $a['points']) return $b['points'] - $a['points'];
                    return $b['played'] - $a['played'];
                });
                $prevRankMap = [];
                $curR = 1;
                foreach ($prevStandings as $ps) {
                    $prevRankMap[$ps['key']] = $curR++;
                }
            } else {
                $prevRankMap = [];
            }

            // 5. Urutkan Leaderboard Saat Ini (Current Standings)
            $leaderboard = array_values($playerMap);
            usort($leaderboard, function($a, $b) {
                if ($b['total_points'] !== $a['total_points']) {
                    return $b['total_points'] - $a['total_points'];
                }
                if ($a['best_rank'] !== $b['best_rank']) {
                    return $a['best_rank'] - $b['best_rank'];
                }
                return $b['played_count'] - $a['played_count'];
            });

            // Beri nomor peringkat dan hitung selisih pergerakan (trend)
            $currentRank = 1;
            foreach ($leaderboard as &$player) {
                $player['rank'] = $currentRank;
                $pKey = strtolower($player['name']);

                if ($previousWeek > 0 && isset($prevRankMap[$pKey])) {
                    $oldRank = $prevRankMap[$pKey];
                    $diff = $oldRank - $currentRank; 
                    // diff > 0: naik rank (misal oldRank 4, currentRank 2 => naik 2)
                    // diff < 0: turun rank (misal oldRank 2, currentRank 5 => turun 3)
                    // diff == 0: rank tetap
                    $player['previous_rank'] = $oldRank;
                    $player['rank_diff'] = $diff;
                    if ($diff > 0) {
                        $player['trend_type'] = 'up';
                        $player['trend_value'] = $diff; // angka positif (misal 2)
                    } elseif ($diff < 0) {
                        $player['trend_type'] = 'down';
                        $player['trend_value'] = abs($diff); // angka positif (misal 3)
                    } else {
                        $player['trend_type'] = 'same';
                        $player['trend_value'] = 0;
                    }
                } else {
                    $player['previous_rank'] = null;
                    $player['rank_diff'] = null;
                    $player['trend_type'] = ($previousWeek > 0) ? 'new' : 'same';
                    $player['trend_value'] = 0;
                }

                // Poin yang didapat pada minggu terbaru yang sudah berjalan
                $latestPts = ($latestWeek > 0 && isset($player['weeks'][$latestWeek])) ? (int)$player['weeks'][$latestWeek]['points'] : 0;
                $player['latest_week_points'] = $latestPts;

                $currentRank++;
            }
            unset($player);

            // 6. Ambil daftar tahun & bulan yang tersedia untuk filter
            $years = [];
            try {
                $yStmt = $this->pdo->query("SELECT DISTINCT year FROM league_tournaments ORDER BY year DESC");
                while ($r = $yStmt->fetch(PDO::FETCH_ASSOC)) {
                    if (!empty($r['year'])) $years[] = (int)$r['year'];
                }
            } catch (\Exception $e) {}

            if (!in_array($currentYear, $years)) {
                $years[] = $currentYear;
                rsort($years);
            }

            // 7. Ambil daftar master pemain yang terdaftar
            $playersMaster = [];
            try {
                $pmStmt = $this->pdo->query("SELECT name FROM league_players ORDER BY name ASC");
                $playersMaster = $pmStmt->fetchAll(PDO::FETCH_COLUMN);
            } catch (\Exception $e) {}

            $this->jsonSuccess([
                'year'            => $year,
                'month'           => $month,
                'available_years' => $years,
                'tournaments'     => $tournaments,
                'leaderboard'     => $leaderboard,
                'players_master'  => $playersMaster,
                'latest_week'     => $latestWeek,
                'summary'         => [
                    'total_tournaments' => count($tournaments),
                    'total_players'     => count($leaderboard),
                    'weeks_count'       => count($weeksPlayed)
                ]
            ]);

        } catch (\Exception $e) {
            $this->jsonError('Gagal memuat data liga: ' . $e->getMessage());
        }
    }

    /**
     * Mengambil detail satu turnamen mingguan (untuk view / modal edit)
     */
    public function getTournamentDetail($payload = []) {
        $this->ensureTables();
        $id = (int)($payload['id'] ?? 0);
        if (!$id) {
            $this->jsonError('ID turnamen wajib disertakan');
        }

        try {
            $tStmt = $this->pdo->prepare("SELECT * FROM league_tournaments WHERE id = ?");
            $tStmt->execute([$id]);
            $tournament = $tStmt->fetch(PDO::FETCH_ASSOC);

            if (!$tournament) {
                $this->jsonError('Turnamen tidak ditemukan');
            }

            $sStmt = $this->pdo->prepare("SELECT * FROM league_scores WHERE tournament_id = ? ORDER BY rank_position ASC, id ASC");
            $sStmt->execute([$id]);
            $scores = $sStmt->fetchAll(PDO::FETCH_ASSOC);

            $this->jsonSuccess([
                'tournament' => $tournament,
                'scores'     => $scores
            ]);
        } catch (\Exception $e) {
            $this->jsonError('Gagal memuat detail turnamen: ' . $e->getMessage());
        }
    }

    /**
     * Simpan / Perbarui Hasil Turnamen Mingguan
     */
    public function saveTournament($payload = []) {
        $this->ensureTables();

        $id             = !empty($payload['id']) ? (int)$payload['id'] : 0;
        $title          = trim($payload['title'] ?? '');
        $tournamentDate = !empty($payload['tournament_date']) ? trim($payload['tournament_date']) : date('Y-m-d');
        $week           = !empty($payload['week']) ? (int)$payload['week'] : 1;
        $notes          = trim($payload['notes'] ?? '');
        $scores         = isset($payload['scores']) && is_array($payload['scores']) ? $payload['scores'] : [];

        if (empty($scores)) {
            $this->jsonError('Minimal harus ada 1 peserta turnamen yang diinput');
        }

        // Hitung tahun & bulan dari tanggal turnamen
        $tTime = strtotime($tournamentDate);
        $year  = !empty($payload['year']) ? (int)$payload['year'] : (int)date('Y', $tTime);
        $month = !empty($payload['month']) ? (int)$payload['month'] : (int)date('m', $tTime);

        $entryFee     = isset($payload['entry_fee']) ? max(0, (int)$payload['entry_fee']) : 10000;
        $prizeCut     = isset($payload['prize_cut']) ? max(0, (int)$payload['prize_cut']) : 0;
        $prizeCutNote = trim($payload['prize_cut_note'] ?? '');
        $prizePct1    = isset($payload['prize_pct_1']) ? max(0, (int)$payload['prize_pct_1']) : 50;
        $prizePct2    = isset($payload['prize_pct_2']) ? max(0, (int)$payload['prize_pct_2']) : 30;
        $prizePct3    = isset($payload['prize_pct_3']) ? max(0, (int)$payload['prize_pct_3']) : 20;

        if (!$title) {
            $title = "Turnamen Mingguan (Minggu {$week})";
        }

        // Jika ID belum ada, cek apakah sesi turnamen untuk tahun, bulan, dan minggu ini sudah pernah dibuat
        if ($id <= 0) {
            $chkStmt = $this->pdo->prepare("SELECT id FROM league_tournaments WHERE year = ? AND month = ? AND week = ? ORDER BY id DESC LIMIT 1");
            $chkStmt->execute([$year, $month, $week]);
            $existingId = $chkStmt->fetchColumn();
            if ($existingId) {
                $id = (int)$existingId;
            }
        }

        // Ambil point rules SEBELUM transaksi (mencegah implicit commit DDL MySQL di tengah transaksi)
        $pointRules = $this->getPointRules();

        // Ambil daftar pemain yang sudah terdaftar di Master Pemain (Validasi wajib terdaftar)
        $pStmt = $this->pdo->query("SELECT name FROM league_players");
        $registeredMap = [];
        while ($pRow = $pStmt->fetch(PDO::FETCH_ASSOC)) {
            $pTrim = trim($pRow['name']);
            if ($pTrim !== '') {
                $registeredMap[strtolower($pTrim)] = $pTrim;
            }
        }

        // Validasi Pemain: Wajib terdaftar & TIDAK BOHONG/DUPLIKAT dalam 1 turnamen
        $cleanedScores = [];
        $seenLower = [];
        foreach ($scores as $item) {
            $pName = trim($item['player_name'] ?? '');
            if ($pName === '') continue;

            $pLower = strtolower($pName);

            // 1. Wajib sudah terdaftar di Master Pemain
            if (!isset($registeredMap[$pLower])) {
                $this->jsonError("Pemain '$pName' belum terdaftar! Silakan daftarkan nama pemain di Master Pemain terlebih dahulu.");
                return;
            }

            // 2. Setiap turnamen hanya boleh ada 1 nama pemain tersebut (tidak boleh ganda)
            if (in_array($pLower, $seenLower)) {
                $canonical = $registeredMap[$pLower];
                $this->jsonError("Pemain '$canonical' dimasukkan lebih dari 1 kali dalam turnamen ini! Setiap turnamen hanya boleh ada 1 nama pemain yang sama.");
                return;
            }

            $seenLower[] = $pLower;
            $item['player_name'] = $registeredMap[$pLower]; // Gunakan nama resmi dari master
            $cleanedScores[] = $item;
        }

        if (empty($cleanedScores)) {
            $this->jsonError("Minimal pilih 1 nama pemain yang terdaftar untuk disimpan.");
            return;
        }

        $this->pdo->beginTransaction();
        try {
            if ($id > 0) {
                // Update turnamen yang sudah ada
                $stmt = $this->pdo->prepare("UPDATE league_tournaments SET 
                    title = ?, tournament_date = ?, year = ?, month = ?, week = ?, 
                    entry_fee = ?, prize_cut = ?, prize_cut_note = ?, 
                    prize_pct_1 = ?, prize_pct_2 = ?, prize_pct_3 = ?, 
                    notes = ?
                    WHERE id = ?");
                $stmt->execute([$title, $tournamentDate, $year, $month, $week, 
                    $entryFee, $prizeCut, $prizeCutNote, 
                    $prizePct1, $prizePct2, $prizePct3, 
                    $notes, $id]);

                // Hapus skor lama untuk turnamen ini
                $delStmt = $this->pdo->prepare("DELETE FROM league_scores WHERE tournament_id = ?");
                $delStmt->execute([$id]);
                $tournamentId = $id;
            } else {
                // Insert turnamen baru
                $stmt = $this->pdo->prepare("INSERT INTO league_tournaments 
                    (title, tournament_date, year, month, week, entry_fee, prize_cut, prize_cut_note, prize_pct_1, prize_pct_2, prize_pct_3, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$title, $tournamentDate, $year, $month, $week, 
                    $entryFee, $prizeCut, $prizeCutNote, 
                    $prizePct1, $prizePct2, $prizePct3, 
                    $notes]);
                $tournamentId = (int)$this->pdo->lastInsertId();
            }

            // Simpan setiap skor peserta
            $scoreStmt = $this->pdo->prepare("INSERT INTO league_scores 
                (tournament_id, player_name, rank_position, points, notes) 
                VALUES (?, ?, ?, ?, ?)");

            foreach ($cleanedScores as $item) {
                $pName = $item['player_name'];
                $rank  = (int)($item['rank_position'] ?? 1);
                $pts   = !empty($item['points']) ? (int)$item['points'] : $this->calculatePoints($rank, $pointRules);
                $scNotes = trim($item['notes'] ?? '');

                $scoreStmt->execute([$tournamentId, $pName, $rank, $pts, $scNotes]);
            }

            if ($this->pdo->inTransaction()) {
                $this->pdo->commit();
            }

            // Log activity
            try {
                $actLog = $this->pdo->prepare("INSERT INTO activity_logs (activity, user_name, card_id) VALUES (?, ?, ?)");
                $actLog->execute(["Input Liga: $title (Minggu $week - " . count($cleanedScores) . " Player)", 'Admin', "T$tournamentId"]);
            } catch (\Exception $ex) {}

            $this->jsonSuccess([
                'id'              => $tournamentId,
                'title'           => $title,
                'tournament_date' => $tournamentDate,
                'year'            => $year,
                'month'           => $month,
                'week'            => $week,
                'player_count'    => count($cleanedScores)
            ]);

        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            $this->jsonError('Gagal menyimpan hasil turnamen: ' . $e->getMessage());
        }
    }

    /**
     * Hapus satu turnamen dan semua hasil skornya
     */
    public function deleteTournament($payload = []) {
        $this->ensureTables();
        $id = (int)($payload['id'] ?? 0);
        if (!$id) {
            $this->jsonError('ID turnamen wajib disertakan');
        }

        try {
            $this->pdo->beginTransaction();
            $delScores = $this->pdo->prepare("DELETE FROM league_scores WHERE tournament_id = ?");
            $delScores->execute([$id]);

            $delTourney = $this->pdo->prepare("DELETE FROM league_tournaments WHERE id = ?");
            $delTourney->execute([$id]);
            if ($this->pdo->inTransaction()) {
                $this->pdo->commit();
            }

            $this->jsonSuccess(['id' => $id]);
        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            $this->jsonError('Gagal menghapus turnamen: ' . $e->getMessage());
        }
    }

    /**
     * Mengambil daftar master pemain
     */
    public function getLeaguePlayers() {
        $this->ensureTables();
        try {
            $stmt = $this->pdo->query("SELECT 
                p.id,
                p.name,
                p.phone,
                p.created_at,
                COUNT(s.id) AS tournaments_played,
                IFNULL(SUM(s.points), 0) AS total_lifetime_points,
                IFNULL(MIN(s.rank_position), '-') AS best_finish
            FROM league_players p
            LEFT JOIN league_scores s ON p.name = s.player_name
            GROUP BY p.id, p.name, p.phone, p.created_at
            ORDER BY total_lifetime_points DESC, p.name ASC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->jsonSuccess($rows);
        } catch (\Exception $e) {
            $this->jsonError('Gagal memuat data pemain: ' . $e->getMessage());
        }
    }

    /**
     * Tambah / simpan nama pemain baru ke master player
     */
    public function saveLeaguePlayer($payload = []) {
        $this->ensureTables();
        $name  = trim($payload['name'] ?? '');
        $phone = trim($payload['phone'] ?? '');

        if (!$name) {
            $this->jsonError('Nama pemain tidak boleh kosong');
        }

        try {
            $stmt = $this->pdo->prepare("INSERT INTO league_players (name, phone) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE phone = VALUES(phone)");
            $stmt->execute([$name, $phone]);
            $this->jsonSuccess(['name' => $name, 'phone' => $phone]);
        } catch (\Exception $e) {
            $this->jsonError('Gagal menyimpan pemain: ' . $e->getMessage());
        }
    }

    /**
     * Mengambil rekap bulanan & season (selama 3 bulan)
     */
    public function getSeasonData($payload = []) {
        $this->ensureTables();

        $year = !empty($payload['year']) ? (int)$payload['year'] : (int)date('Y');
        $season = !empty($payload['season']) ? (int)$payload['season'] : 4; // default Season 4 (Okt-Des) jika sekarang Nov

        // 4 Seasons (3 bulan per season):
        // Season 1: Jan (1), Feb (2), Mar (3)
        // Season 2: Apr (4), Mei (5), Jun (6)
        // Season 3: Jul (7), Agu (8), Sep (9)
        // Season 4: Okt (10), Nov (11), Des (12)
        $seasonMap = [
            1 => [1, 2, 3],
            2 => [4, 5, 6],
            3 => [7, 8, 9],
            4 => [10, 11, 12]
        ];

        $months = $seasonMap[$season] ?? [10, 11, 12];
        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        try {
            $inMonths = implode(',', $months);
            $stmt = $this->pdo->prepare("SELECT 
                s.player_name,
                s.rank_position,
                s.points,
                t.month,
                t.week
            FROM league_scores s
            JOIN league_tournaments t ON s.tournament_id = t.id
            WHERE t.year = ? AND t.month IN ($inMonths)
            ORDER BY s.player_name ASC");
            $stmt->execute([$year]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $playerMap = [];
            foreach ($rows as $r) {
                $pName = trim($r['player_name']);
                if ($pName === '') continue;

                if (!isset($playerMap[$pName])) {
                    $playerMap[$pName] = [
                        'name'                 => $pName,
                        'month_points'         => [
                            $months[0] => 0,
                            $months[1] => 0,
                            $months[2] => 0
                        ],
                        'total_season_points'  => 0,
                        'tournaments_played'   => 0,
                        'first_place_count'    => 0,
                        'best_rank'            => 999
                    ];
                }

                $m = (int)$r['month'];
                $pts = (int)$r['points'];
                $pos = (int)$r['rank_position'];

                if (isset($playerMap[$pName]['month_points'][$m])) {
                    $playerMap[$pName]['month_points'][$m] += $pts;
                }

                $playerMap[$pName]['total_season_points'] += $pts;
                $playerMap[$pName]['tournaments_played'] += 1;
                if ($pos === 1) {
                    $playerMap[$pName]['first_place_count'] += 1;
                }
                if ($pos < $playerMap[$pName]['best_rank']) {
                    $playerMap[$pName]['best_rank'] = $pos;
                }
            }

            $leaderboard = array_values($playerMap);
            usort($leaderboard, function($a, $b) {
                if ($b['total_season_points'] !== $a['total_season_points']) {
                    return $b['total_season_points'] - $a['total_season_points'];
                }
                if ($b['first_place_count'] !== $a['first_place_count']) {
                    return $b['first_place_count'] - $a['first_place_count'];
                }
                return $a['best_rank'] - $b['best_rank'];
            });

            // Hitung tren pergerakan peringkat Season (dibandingkan sebelum turnamen terakhir)
            $tTourneys = $this->pdo->prepare("SELECT id, tournament_date FROM league_tournaments 
                WHERE year = ? AND month IN ($inMonths) 
                ORDER BY tournament_date ASC, id ASC");
            $tTourneys->execute([$year]);
            $seasonTourneys = $tTourneys->fetchAll(PDO::FETCH_ASSOC);

            $prevRankMap = [];
            if (count($seasonTourneys) > 1) {
                $prevTourneyIds = array_slice(array_column($seasonTourneys, 'id'), 0, -1);
                if (!empty($prevTourneyIds)) {
                    $inPrev = implode(',', array_map('intval', $prevTourneyIds));
                    $prevScoreStmt = $this->pdo->query("SELECT 
                        s.player_name,
                        SUM(s.points) AS prev_points,
                        COUNT(s.id) AS prev_played,
                        SUM(CASE WHEN s.rank_position = 1 THEN 1 ELSE 0 END) AS prev_first,
                        MIN(s.rank_position) AS prev_best
                    FROM league_scores s
                    WHERE s.tournament_id IN ($inPrev)
                    GROUP BY s.player_name");
                    $prevRows = $prevScoreStmt->fetchAll(PDO::FETCH_ASSOC);
                    usort($prevRows, function($a, $b) {
                        if ($b['prev_points'] !== $a['prev_points']) {
                            return $b['prev_points'] - $a['prev_points'];
                        }
                        if ($b['prev_first'] !== $a['prev_first']) {
                            return $b['prev_first'] - $a['prev_first'];
                        }
                        return $a['prev_best'] - $b['prev_best'];
                    });
                    $pRank = 1;
                    foreach ($prevRows as $pr) {
                        $prevRankMap[strtolower(trim($pr['player_name']))] = $pRank++;
                    }
                }
            }

            $rank = 1;
            foreach ($leaderboard as &$p) {
                $p['rank'] = $rank;
                $pKey = strtolower($p['name']);

                if (isset($prevRankMap[$pKey])) {
                    $oldRank = $prevRankMap[$pKey];
                    $diff = $oldRank - $rank;
                    if ($diff > 0) {
                        $p['trend_type'] = 'up';
                        $p['trend_value'] = $diff;
                    } elseif ($diff < 0) {
                        $p['trend_type'] = 'down';
                        $p['trend_value'] = abs($diff);
                    } else {
                        $p['trend_type'] = 'same';
                        $p['trend_value'] = 0;
                    }
                } else {
                    if (count($seasonTourneys) > 1) {
                        $p['trend_type'] = 'new';
                        $p['trend_value'] = 0;
                    } else {
                        $p['trend_type'] = 'same';
                        $p['trend_value'] = 0;
                    }
                }
                $rank++;
            }
            unset($p);

            $this->jsonSuccess([
                'year'        => $year,
                'season'      => $season,
                'season_name' => "Season $season ({$monthNames[$months[0]]} – {$monthNames[$months[2]]} $year)",
                'months'      => [
                    ['number' => $months[0], 'name' => $monthNames[$months[0]]],
                    ['number' => $months[1], 'name' => $monthNames[$months[1]]],
                    ['number' => $months[2], 'name' => $monthNames[$months[2]]],
                ],
                'leaderboard' => $leaderboard,
                'total_players' => count($leaderboard)
            ]);

        } catch (\Exception $e) {
            $this->jsonError('Gagal memuat rekap season: ' . $e->getMessage());
        }
    }

    /**
     * Mengambil data Hadiah Turnamen (Prize Pool) Season 3 Bulan:
     * - Akumulasi biaya masuk (Rp 10.000 / pemain) dari seluruh turnamen mingguan selama 3 bulan
     * - Potongan kas toko & penjelasannya
     * - Pembagian hadiah Juara 1 (50%), 2 (30%), 3 (20%) Klasemen Season 3 Bulan
     * - Rincian histori kontribusi turnamen mingguan
     */
    public function getPrizeData($payload = []) {
        $this->ensureTables();
        $year   = !empty($payload['year']) ? (int)$payload['year'] : (int)date('Y');
        $season = !empty($payload['season']) ? (int)$payload['season'] : (int)ceil((int)date('n') / 3);

        $seasonMap = [
            1 => [1, 2, 3],
            2 => [4, 5, 6],
            3 => [7, 8, 9],
            4 => [10, 11, 12]
        ];
        $seasonLabels = [
            1 => 'Season 1 (Jan - Mar)',
            2 => 'Season 2 (Apr - Jun)',
            3 => 'Season 3 (Jul - Sep)',
            4 => 'Season 4 (Okt - Des)'
        ];

        $months = $seasonMap[$season] ?? [10, 11, 12];
        $inMonths = implode(',', $months);

        $monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        try {
            // Ambil setting prize untuk Season ini dari league_settings
            $settingKey = "prize_season_{$year}_{$season}";
            $setStmt = $this->pdo->prepare("SELECT setting_value FROM league_settings WHERE setting_key = ?");
            $setStmt->execute([$settingKey]);
            $setRow = $setStmt->fetch(PDO::FETCH_ASSOC);
            $settings = $setRow ? json_decode($setRow['setting_value'], true) : [];

            $entryFee     = isset($settings['entry_fee']) ? max(0, (int)$settings['entry_fee']) : 10000;
            $prizeCut     = isset($settings['prize_cut']) ? max(0, (int)$settings['prize_cut']) : 0;
            $prizeCutNote = trim($settings['prize_cut_note'] ?? '');
            $prizePct1    = isset($settings['prize_pct_1']) ? max(0, (int)$settings['prize_pct_1']) : 50;
            $prizePct2    = isset($settings['prize_pct_2']) ? max(0, (int)$settings['prize_pct_2']) : 30;
            $prizePct3    = isset($settings['prize_pct_3']) ? max(0, (int)$settings['prize_pct_3']) : 20;

            // Ambil semua turnamen yang diadakan selama 3 bulan season ini
            $tStmt = $this->pdo->prepare("SELECT * FROM league_tournaments 
                WHERE year = ? AND month IN ($inMonths) 
                ORDER BY month ASC, week ASC, tournament_date ASC");
            $tStmt->execute([$year]);
            $tourneys = $tStmt->fetchAll(PDO::FETCH_ASSOC);

            $weeklyBreakdown = [];
            $totalPlayersAll = 0;

            foreach ($tourneys as $t) {
                $tId = (int)$t['id'];
                $sStmt = $this->pdo->prepare("SELECT player_name, rank_position, points FROM league_scores WHERE tournament_id = ? ORDER BY rank_position ASC");
                $sStmt->execute([$tId]);
                $scores = $sStmt->fetchAll(PDO::FETCH_ASSOC);

                $playerCount = count($scores);
                $totalPlayersAll += $playerCount;
                $grossWeek = $playerCount * $entryFee;

                $w1Name = '-';
                $w2Name = '-';
                $w3Name = '-';
                foreach ($scores as $sc) {
                    $pos = (int)$sc['rank_position'];
                    if ($pos === 1 && $w1Name === '-') $w1Name = $sc['player_name'];
                    else if ($pos === 2 && $w2Name === '-') $w2Name = $sc['player_name'];
                    else if ($pos === 3 && $w3Name === '-') $w3Name = $sc['player_name'];
                }

                $weeklyBreakdown[] = [
                    'id'               => $tId,
                    'month'            => (int)$t['month'],
                    'month_name'       => $monthNames[(int)$t['month']] ?? 'Bulan',
                    'week'             => (int)$t['week'],
                    'title'            => $t['title'],
                    'tournament_date'  => $t['tournament_date'],
                    'player_count'     => $playerCount,
                    'gross_pool'       => $grossWeek,
                    'winner_1'         => $w1Name,
                    'winner_2'         => $w2Name,
                    'winner_3'         => $w3Name
                ];
            }

            // Hitung akumulasi Season 3 Bulan
            $totalGrossPool = $totalPlayersAll * $entryFee;
            $totalNetPool   = max(0, $totalGrossPool - $prizeCut);

            // Ambil Top 3 Juara Season dari akumulasi poin 3 bulan tersebut
            $pStmt = $this->pdo->prepare("SELECT s.player_name, SUM(s.points) AS total_pts, COUNT(s.id) AS played_count, MIN(s.rank_position) AS best_rank
                FROM league_scores s
                JOIN league_tournaments t ON s.tournament_id = t.id
                WHERE t.year = ? AND t.month IN ($inMonths)
                GROUP BY s.player_name
                ORDER BY total_pts DESC, best_rank ASC, played_count DESC");
            $pStmt->execute([$year]);
            $seasonStandings = $pStmt->fetchAll(PDO::FETCH_ASSOC);

            $winner1 = $seasonStandings[0] ?? null;
            $winner2 = $seasonStandings[1] ?? null;
            $winner3 = $seasonStandings[2] ?? null;

            $prize1 = (int)round(($totalNetPool * $prizePct1) / 100);
            $prize2 = (int)round(($totalNetPool * $prizePct2) / 100);
            $prize3 = (int)round(($totalNetPool * $prizePct3) / 100);

            // Ambil semua klaim / pemakaian hadiah untuk season ini
            $clStmt = $this->pdo->prepare("SELECT id, rank_position, player_name, amount_claimed, notes, created_at 
                FROM league_prize_claims 
                WHERE year = ? AND season = ? 
                ORDER BY created_at DESC, id DESC");
            $clStmt->execute([$year, $season]);
            $allClaims = $clStmt->fetchAll(PDO::FETCH_ASSOC);

            $claimedByRank = [1 => 0, 2 => 0, 3 => 0];
            $claimsByRank  = [1 => [], 2 => [], 3 => []];
            foreach ($allClaims as $cl) {
                $rp = (int)$cl['rank_position'];
                if (isset($claimedByRank[$rp])) {
                    $claimedByRank[$rp] += (int)$cl['amount_claimed'];
                    $claimsByRank[$rp][] = $cl;
                }
            }

            $this->jsonSuccess([
                'year'               => $year,
                'season'             => $season,
                'season_label'       => $seasonLabels[$season] ?? "Season $season ($year)",
                'settings'           => [
                    'entry_fee'      => $entryFee,
                    'prize_cut'      => $prizeCut,
                    'prize_cut_note' => $prizeCutNote,
                    'prize_pct_1'    => $prizePct1,
                    'prize_pct_2'    => $prizePct2,
                    'prize_pct_3'    => $prizePct3,
                ],
                'summary'            => [
                    'total_tournaments' => count($tourneys),
                    'total_players'     => $totalPlayersAll,
                    'total_gross_pool'  => $totalGrossPool,
                    'prize_cut'         => $prizeCut,
                    'prize_cut_note'    => $prizeCutNote,
                    'total_net_pool'    => $totalNetPool,
                ],
                'winners'            => [
                    1 => [
                        'name'              => $winner1 ? $winner1['player_name'] : '-',
                        'points'            => $winner1 ? (int)$winner1['total_pts'] : 0,
                        'pct'               => $prizePct1,
                        'amount'            => $prize1,
                        'claimed_amount'    => $claimedByRank[1],
                        'remaining_balance' => max(0, $prize1 - $claimedByRank[1]),
                        'claims'            => $claimsByRank[1]
                    ],
                    2 => [
                        'name'              => $winner2 ? $winner2['player_name'] : '-',
                        'points'            => $winner2 ? (int)$winner2['total_pts'] : 0,
                        'pct'               => $prizePct2,
                        'amount'            => $prize2,
                        'claimed_amount'    => $claimedByRank[2],
                        'remaining_balance' => max(0, $prize2 - $claimedByRank[2]),
                        'claims'            => $claimsByRank[2]
                    ],
                    3 => [
                        'name'              => $winner3 ? $winner3['player_name'] : '-',
                        'points'            => $winner3 ? (int)$winner3['total_pts'] : 0,
                        'pct'               => $prizePct3,
                        'amount'            => $prize3,
                        'claimed_amount'    => $claimedByRank[3],
                        'remaining_balance' => max(0, $prize3 - $claimedByRank[3]),
                        'claims'            => $claimsByRank[3]
                    ],
                ],
                'all_claims'         => $allClaims,
                'weeks'              => $weeklyBreakdown
            ]);

        } catch (\Exception $e) {
            $this->jsonError('Gagal memuat data prize season: ' . $e->getMessage());
        }
    }

    /**
     * Simpan kustomisasi prize cut & fee per Season 3 Bulan
     */
    public function savePrizeSettings($payload = []) {
        $this->ensureTables();
        $year   = !empty($payload['year']) ? (int)$payload['year'] : (int)date('Y');
        $season = !empty($payload['season']) ? (int)$payload['season'] : (int)ceil((int)date('n') / 3);

        $entryFee     = isset($payload['entry_fee']) ? max(0, (int)$payload['entry_fee']) : 10000;
        $prizeCut     = isset($payload['prize_cut']) ? max(0, (int)$payload['prize_cut']) : 0;
        $prizeCutNote = trim($payload['prize_cut_note'] ?? '');
        $prizePct1    = isset($payload['prize_pct_1']) ? max(0, (int)$payload['prize_pct_1']) : 50;
        $prizePct2    = isset($payload['prize_pct_2']) ? max(0, (int)$payload['prize_pct_2']) : 30;
        $prizePct3    = isset($payload['prize_pct_3']) ? max(0, (int)$payload['prize_pct_3']) : 20;

        try {
            $settingKey = "prize_season_{$year}_{$season}";
            $data = json_encode([
                'entry_fee'      => $entryFee,
                'prize_cut'      => $prizeCut,
                'prize_cut_note' => $prizeCutNote,
                'prize_pct_1'    => $prizePct1,
                'prize_pct_2'    => $prizePct2,
                'prize_pct_3'    => $prizePct3
            ]);

            $stmt = $this->pdo->prepare("INSERT INTO league_settings (setting_key, setting_value) VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $stmt->execute([$settingKey, $data]);

            $this->jsonSuccess([
                'year'    => $year,
                'season'  => $season,
                'message' => 'Pengaturan hadiah season berhasil disimpan'
            ]);
        } catch (\Exception $e) {
            $this->jsonError('Gagal menyimpan pengaturan hadiah: ' . $e->getMessage());
        }
    }

    /**
     * Pencairan / Pengurangan Hadiah Pemain (Tombol Minus)
     */
    public function claimPrize($payload = []) {
        $this->ensureTables();
        $year         = !empty($payload['year']) ? (int)$payload['year'] : (int)date('Y');
        $season       = !empty($payload['season']) ? (int)$payload['season'] : (int)ceil((int)date('n') / 3);
        $rankPosition = !empty($payload['rank_position']) ? (int)$payload['rank_position'] : 1;
        $playerName   = trim($payload['player_name'] ?? '');
        $amount       = max(0, (int)($payload['amount_claimed'] ?? 0));
        $notes        = trim($payload['notes'] ?? '');

        if ($amount <= 0) {
            $this->jsonError('Nominal pencairan harus lebih dari 0');
        }

        try {
            $stmt = $this->pdo->prepare("INSERT INTO league_prize_claims 
                (year, season, rank_position, player_name, amount_claimed, notes) 
                VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$year, $season, $rankPosition, $playerName, $amount, $notes]);

            try {
                $actLog = $this->pdo->prepare("INSERT INTO activity_logs (activity, user_name, card_id) VALUES (?, ?, ?)");
                $actLog->execute(["Pencairan Hadiah: Juara $rankPosition ($playerName) Rp " . number_format($amount, 0, ',', '.') . " - $notes", 'Admin', "CLAIM"]);
            } catch (\Exception $ex) {}

            $this->getPrizeData(['year' => $year, 'season' => $season]);
        } catch (\Exception $e) {
            $this->jsonError('Gagal mencatat pencairan hadiah: ' . $e->getMessage());
        }
    }

    /**
     * Hapus riwayat pencairan hadiah jika salah input
     */
    public function deletePrizeClaim($payload = []) {
        $this->ensureTables();
        $id     = (int)($payload['id'] ?? 0);
        $year   = !empty($payload['year']) ? (int)$payload['year'] : (int)date('Y');
        $season = !empty($payload['season']) ? (int)$payload['season'] : (int)ceil((int)date('n') / 3);

        if (!$id) {
            $this->jsonError('ID klaim wajib disertakan');
        }

        try {
            $stmt = $this->pdo->prepare("DELETE FROM league_prize_claims WHERE id = ?");
            $stmt->execute([$id]);

            $this->getPrizeData(['year' => $year, 'season' => $season]);
        } catch (\Exception $e) {
            $this->jsonError('Gagal menghapus riwayat klaim: ' . $e->getMessage());
        }
    }

    /**
     * Endpoint publik untuk Leaderboard Season Berjalan (Landing Page, tanpa filter)
     */
    public function getActiveSeasonLeaderboard() {
        $year = (int)date('Y');
        $currentMonth = (int)date('n');
        $season = (int)ceil($currentMonth / 3);

        $this->getSeasonData([
            'year'   => $year,
            'season' => $season
        ]);
    }
}
