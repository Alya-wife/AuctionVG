<?php
/**
 * StatsController - Menangani statistik ringkasan dashboard, jadwal penerimaan kartu & aktivitas terbaru
 */

require_once __DIR__ . '/BaseController.php';

class StatsController extends BaseController {

    public function getStats() {
        $stmt = $this->pdo->query("SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available,
            SUM(CASE WHEN status = 'Sold' OR status = 'Completed' THEN 1 ELSE 0 END) AS sold,
            SUM(CASE WHEN status = 'Auction' THEN 1 ELSE 0 END) AS auction,
            SUM(CASE WHEN status = 'Waiting Shipment' OR status = 'Shipped' THEN 1 ELSE 0 END) AS shipment,
            SUM(CASE WHEN status = 'Waiting Payment' THEN 1 ELSE 0 END) AS payment,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
        FROM inventory");
        $cardStats = $stmt->fetch();

        $aucStmt = $this->pdo->query("SELECT
            SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS auctionActive,
            SUM(CASE WHEN status = 'Finished' THEN 1 ELSE 0 END) AS auctionDone
        FROM auctions");
        $aucStats = $aucStmt->fetch();

        $this->jsonSuccess([
            'available'     => (int)($cardStats['available'] ?? 0),
            'shipment'      => (int)($cardStats['shipment'] ?? 0),
            'payment'       => (int)($cardStats['payment'] ?? 0),
            'sold'          => (int)($cardStats['sold'] ?? 0),
            'auctionActive' => (int)($aucStats['auctionActive'] ?? 0),
            'auctionDone'   => (int)($aucStats['auctionDone'] ?? 0)
        ]);
    }

    public function getActivities() {
        try {
            $activities = [];

            // 1. Fetch recent inventory cards
            $cardsStmt = $this->pdo->query("SELECT id, name, status, created_by, updated_at, created_at, date FROM inventory ORDER BY updated_at DESC LIMIT 12");
            $cards = $cardsStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($cards as $c) {
                $actType = 'Input Stock';
                if (in_array($c['status'], ['Waiting Payment', 'Completed'])) {
                    $actType = 'Payment';
                } elseif (in_array($c['status'], ['Waiting Shipment', 'Shipped'])) {
                    $actType = 'Shipment';
                }

                $time = !empty($c['updated_at']) ? $c['updated_at'] : (!empty($c['created_at']) ? $c['created_at'] : $c['date']);
                $user = !empty($c['created_by']) ? $c['created_by'] : 'Ravy';
                if (strpos($user, '@') !== false) {
                    $user = explode('@', $user)[0];
                }
                $user = preg_replace('/\s*\(.*?\)/', '', $user);

                $activities[] = [
                    'item'     => $c['name'],
                    'activity' => $actType,
                    'user'     => trim($user) ?: 'Ravy',
                    'time'     => $time,
                    'raw_time' => strtotime($time)
                ];
            }

            // 2. Fetch recent auctions
            $aucStmt = $this->pdo->query("SELECT a.id, a.status, a.date, COUNT(ai.id) as card_count 
                FROM auctions a 
                LEFT JOIN auction_items ai ON a.id = ai.auction_id 
                GROUP BY a.id 
                ORDER BY a.date DESC LIMIT 5");
            $auctions = $aucStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($auctions as $a) {
                $actType = ($a['status'] === 'Active') ? 'Start Auction' : 'Finish Auction';
                $activities[] = [
                    'item'     => ($a['card_count'] ?: 0) . ' Kartu',
                    'activity' => $actType,
                    'user'     => 'Ravy',
                    'time'     => $a['date'] . ' 12:00:00',
                    'raw_time' => strtotime($a['date'])
                ];
            }

            // Sort descending by time
            usort($activities, function($a, $b) {
                return $b['raw_time'] - $a['raw_time'];
            });

            $activities = array_slice($activities, 0, 10);
            $this->jsonSuccess($activities);
        } catch (\Exception $e) {
            $this->jsonSuccess([]);
        }
    }

    public function getReceivedDatesSummary() {
        try {
            $stmt = $this->pdo->query("SELECT date, COUNT(*) as count FROM inventory WHERE date IS NOT NULL AND date > '2000-01-01' GROUP BY date");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->jsonSuccess($rows);
        } catch (\Exception $e) {
            $this->jsonSuccess([]);
        }
    }

    public function getCardsByDate($payload = []) {
        $date = $payload['date'] ?? ($_GET['date'] ?? '');
        if (!$date) {
            $this->jsonError('Parameter date diperlukan');
        }

        $stmt = $this->pdo->prepare("SELECT * FROM inventory WHERE date = ? ORDER BY id DESC");
        $stmt->execute([$date]);
        $cards = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $timestamp = strtotime($date);
        $dayOfWeek = (int)date('N', $timestamp); // 1 = Monday, 3 = Wednesday, 6 = Saturday
        $isWednesdayOrSaturday = ($dayOfWeek === 3 || $dayOfWeek === 6);

        $indonesianDays = [
            1 => 'Senin',
            2 => 'Selasa',
            3 => 'Rabu',
            4 => 'Kamis',
            5 => 'Jumat',
            6 => 'Sabtu',
            7 => 'Minggu'
        ];

        $this->jsonSuccess([
            'date'                  => $date,
            'dayName'               => $indonesianDays[$dayOfWeek] ?? date('l', $timestamp),
            'dayOfWeek'             => $dayOfWeek,
            'isWednesdayOrSaturday' => $isWednesdayOrSaturday,
            'count'                 => count($cards),
            'cards'                 => $cards
        ]);
    }

    /**
     * Mengambil ringkasan total uang penjualan dan komisi jastip
     */
    public function getIncomeSummary($payload = []) {
        try {
            $year  = !empty($payload['year']) ? (int)$payload['year'] : 0;
            $month = !empty($payload['month']) ? (int)$payload['month'] : 0;

            $where = ["1=1"];
            $params = [];

            if ($year > 0) {
                $where[] = "YEAR(COALESCE(NULLIF(sold_date, ''), NULLIF(date, ''), created_at)) = ?";
                $params[] = $year;
            }
            if ($month > 0) {
                $where[] = "MONTH(COALESCE(NULLIF(sold_date, ''), NULLIF(date, ''), created_at)) = ?";
                $params[] = $month;
            }

            $whereSql = implode(' AND ', $where);

            $stmt = $this->pdo->prepare("SELECT
                IFNULL(SUM(CASE WHEN price > 0 THEN price ELSE 0 END), 0) AS total_sales,
                IFNULL(SUM(CASE WHEN commission > 0 THEN commission ELSE 0 END), 0) AS total_commission,
                COUNT(CASE WHEN price > 0 THEN 1 END) AS sold_count,
                COUNT(CASE WHEN commission > 0 THEN 1 END) AS comm_count,
                IFNULL(SUM(CASE WHEN status = 'Completed' AND price > 0 THEN price ELSE 0 END), 0) AS completed_sales,
                IFNULL(SUM(CASE WHEN status = 'Completed' AND commission > 0 THEN commission ELSE 0 END), 0) AS completed_commission,
                IFNULL(SUM(CASE WHEN status IN ('Waiting Payment', 'Waiting Shipment') AND price > 0 THEN price ELSE 0 END), 0) AS pending_sales,
                IFNULL(SUM(CASE WHEN status IN ('Waiting Payment', 'Waiting Shipment') AND commission > 0 THEN commission ELSE 0 END), 0) AS pending_commission
            FROM inventory
            WHERE {$whereSql}");
            $stmt->execute($params);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            // Ambil daftar tahun unik yang tersedia di database
            $years = [];
            try {
                $yrStmt = $this->pdo->query("SELECT DISTINCT YEAR(COALESCE(NULLIF(sold_date, ''), NULLIF(date, ''), created_at)) AS yr 
                    FROM inventory 
                    WHERE (price > 0 OR commission > 0 OR sold_date IS NOT NULL) 
                    ORDER BY yr DESC");
                while ($yRow = $yrStmt->fetch(PDO::FETCH_ASSOC)) {
                    if (!empty($yRow['yr'])) {
                        $years[] = (int)$yRow['yr'];
                    }
                }
            } catch (\Exception $e) {}

            $currentYear = (int)date('Y');
            if (!in_array($currentYear, $years)) {
                $years[] = $currentYear;
                rsort($years);
            }

            $this->jsonSuccess([
                'totalSales'          => (float)($data['total_sales'] ?? 0),
                'totalCommission'     => (float)($data['total_commission'] ?? 0),
                'soldCount'           => (int)($data['sold_count'] ?? 0),
                'commCount'           => (int)($data['comm_count'] ?? 0),
                'completedSales'      => (float)($data['completed_sales'] ?? 0),
                'completedCommission' => (float)($data['completed_commission'] ?? 0),
                'pendingSales'        => (float)($data['pending_sales'] ?? 0),
                'pendingCommission'   => (float)($data['pending_commission'] ?? 0),
                'availableYears'      => $years,
                'filterYear'          => $year,
                'filterMonth'         => $month
            ]);
        } catch (\Exception $e) {
            $this->jsonError('Gagal memuat ringkasan penghasilan: ' . $e->getMessage());
        }
    }

    /**
     * Mengambil daftar transaksi penjualan & komisi kartu
     */
    public function getIncomeTransactions($payload = []) {
        try {
            $year  = !empty($payload['year']) ? (int)$payload['year'] : 0;
            $month = !empty($payload['month']) ? (int)$payload['month'] : 0;

            $where = ["(price > 0 OR commission > 0 OR status IN ('Waiting Payment', 'Waiting Shipment', 'Completed', 'Sold'))"];
            $params = [];

            if ($year > 0) {
                $where[] = "YEAR(COALESCE(NULLIF(sold_date, ''), NULLIF(date, ''), created_at)) = ?";
                $params[] = $year;
            }
            if ($month > 0) {
                $where[] = "MONTH(COALESCE(NULLIF(sold_date, ''), NULLIF(date, ''), created_at)) = ?";
                $params[] = $month;
            }

            $whereSql = implode(' AND ', $where);

            $stmt = $this->pdo->prepare("SELECT
                id, name, grade, set_name, type, nation, owner, date,
                status, buyer, price, commission, sold_date, payout_date,
                tracking_number, payout_proof_url
            FROM inventory
            WHERE {$whereSql}
            ORDER BY (CASE WHEN sold_date IS NOT NULL THEN sold_date ELSE '1970-01-01' END) DESC, id DESC");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format data
            foreach ($rows as &$r) {
                $r['price'] = (float)($r['price'] ?? 0);
                $r['commission'] = (float)($r['commission'] ?? 0);
            }

            $this->jsonSuccess($rows);
        } catch (\Exception $e) {
            $this->jsonError('Gagal memuat detail transaksi: ' . $e->getMessage());
        }
    }

    /**
     * Simpan / Perbarui Transaksi Penjualan & Komisi (CRUD Update/Create)
     */
    public function saveIncomeTransaction($payload = []) {
        $id         = trim($payload['id'] ?? '');
        $price      = (float)($payload['price'] ?? 0);
        $commission = (float)($payload['commission'] ?? 0);
        $buyer      = trim($payload['buyer'] ?? '');
        $owner      = trim($payload['owner'] ?? '');
        $status     = trim($payload['status'] ?? 'Completed');
        
        $rawSold    = trim((string)($payload['sold_date'] ?? ''));
        $soldDate   = ($rawSold !== '' && $rawSold !== 'null') ? substr($rawSold, 0, 10) : date('Y-m-d');
        
        $rawPayout  = trim((string)($payload['payout_date'] ?? ''));
        $payoutDate = ($rawPayout !== '' && $rawPayout !== 'null') ? substr($rawPayout, 0, 10) : null;

        if (!$id) {
            $this->jsonError('ID kartu wajib diisi');
        }

        try {
            $fields = [
                "price = ?",
                "commission = ?",
                "buyer = ?",
                "status = ?",
                "sold_date = ?",
                "payout_date = ?"
            ];
            $params = [$price, $commission, $buyer, $status, $soldDate, $payoutDate];

            if ($owner !== '') {
                $fields[] = "owner = ?";
                $params[] = $owner;
            }

            $params[] = $id;

            $stmt = $this->pdo->prepare("UPDATE inventory SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute($params);

            try {
                $logStmt = $this->pdo->prepare("INSERT INTO activity_logs (activity, user_name, card_id) VALUES (?, ?, ?)");
                $logStmt->execute(["Update Penghasilan: $id - Rp " . number_format($price,0,',','.') . " (Komisi: Rp " . number_format($commission,0,',','.') . ")", 'Admin', $id]);
            } catch (\Exception $ex) {}

            $this->jsonSuccess([
                'id'         => $id,
                'price'      => $price,
                'commission' => $commission,
                'buyer'      => $buyer,
                'owner'      => $owner,
                'status'     => $status,
                'sold_date'  => $soldDate,
                'payout_date'=> $payoutDate
            ]);
        } catch (\Exception $e) {
            $this->jsonError('Gagal menyimpan transaksi: ' . $e->getMessage());
        }
    }

    /**
     * Hapus / Reset Transaksi Penjualan & Komisi (CRUD Delete)
     */
    public function deleteIncomeTransaction($payload = []) {
        $id = trim($payload['id'] ?? '');
        if (!$id) {
            $this->jsonError('ID kartu wajib diisi');
        }

        try {
            $stmt = $this->pdo->prepare("UPDATE inventory SET
                price = 0,
                commission = 0,
                buyer = NULL,
                sold_date = NULL,
                payout_date = NULL,
                status = 'Available'
            WHERE id = ?");
            $stmt->execute([$id]);

            try {
                $logStmt = $this->pdo->prepare("INSERT INTO activity_logs (activity, user_name, card_id) VALUES (?, ?, ?)");
                $logStmt->execute(["Reset Penjualan: $id kembali Available", 'Admin', $id]);
            } catch (\Exception $ex) {}

            $this->jsonSuccess(['id' => $id, 'status' => 'Available']);
        } catch (\Exception $e) {
            $this->jsonError('Gagal mereset transaksi: ' . $e->getMessage());
        }
    }
}

