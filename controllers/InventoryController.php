<?php
/**
 * InventoryController - Menangani CRUD kartu dan pembaruan status kartu
 */

require_once __DIR__ . '/BaseController.php';

class InventoryController extends BaseController {

    
    /**
     * Pastikan tabel cards_master ada dan terisi data awal
     */
    private function ensureCardsMasterTable() {
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS `cards_master` (
            `id` VARCHAR(50) NOT NULL PRIMARY KEY,
            `name` VARCHAR(255) NOT NULL,
            `grade` VARCHAR(10) DEFAULT '3',
            `set_name` VARCHAR(100) DEFAULT '',
            `language` VARCHAR(10) DEFAULT 'JP',
            `nation` VARCHAR(50) DEFAULT '',
            `power` VARCHAR(20) DEFAULT '',
            `shield` VARCHAR(20) DEFAULT '',
            `image` VARCHAR(255) DEFAULT '',
            `created_by` VARCHAR(100) DEFAULT 'Admin',
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `idx_set` (`set_name`),
            INDEX `idx_nation` (`nation`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // Jika masih kosong, seeding otomatis dari cards.json
        try {
            $chk = $this->pdo->query("SELECT COUNT(*) AS total FROM `cards_master`")->fetch();
            if ($chk && (int)$chk['total'] === 0) {
                $jsonFile = __DIR__ . '/../assets/data/cards.json';
                if (file_exists($jsonFile)) {
                    $cards = json_decode(file_get_contents($jsonFile), true);
                    if (!empty($cards) && is_array($cards)) {
                        $stmt = $this->pdo->prepare("INSERT INTO `cards_master` 
                            (`id`, `name`, `grade`, `set_name`, `language`, `nation`, `image`, `created_by`) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, 'System')");
                        foreach ($cards as $c) {
                            $cId   = $c['id'] ?? '';
                            $cName = $c['name'] ?? '';
                            $cGrade = (string)($c['grade'] ?? '3');
                            $cSet  = $c['set'] ?? ($c['set_name'] ?? '');
                            $cLang = $c['language'] ?? 'JP';
                            $cNat  = $c['nation'] ?? '';
                            $cImg  = $c['image'] ?? '';
                            if ($cId && $cName) {
                                try {
                                    $stmt->execute([$cId, $cName, $cGrade, $cSet, $cLang, $cNat, $cImg]);
                                } catch (\Exception $e) {}
                            }
                        }
                    }
                }
            }
        } catch (\Exception $e) {}
    }

    public function getMasterCards() {
        $this->ensureCardsMasterTable();
        $stmt = $this->pdo->query("SELECT 
            id, 
            IFNULL(name, '') AS `name`, 
            IFNULL(grade, '3') AS `grade`, 
            IFNULL(set_name, '') AS `set`, 
            IFNULL(language, 'JP') AS `language`, 
            IFNULL(nation, '') AS `nation`, 
            IFNULL(power, '') AS `power`, 
            IFNULL(shield, '') AS `shield`, 
            IFNULL(image, '') AS `image`, 
            IFNULL(created_by, 'Admin') AS `createdBy`, 
            IFNULL(created_at, '') AS `createdAt`
        FROM `cards_master`
        ORDER BY created_at DESC, id ASC");
        $rows = $stmt->fetchAll();
        $this->jsonSuccess($rows);
    }

    public function saveMasterCard($payload) {
        $this->ensureCardsMasterTable();
        $id        = trim($payload['id'] ?? '');
        $name      = trim($payload['name'] ?? '');
        $grade     = trim((string)($payload['grade'] ?? '3'));
        $set       = trim($payload['set'] ?? ($payload['set_name'] ?? ''));
        $language  = strtoupper(trim($payload['language'] ?? 'JP'));
        $nation    = trim($payload['nation'] ?? '');
        $power     = trim($payload['power'] ?? '');
        $shield    = trim($payload['shield'] ?? '');
        $image     = trim($payload['image'] ?? '');
        $createdBy = trim($payload['created_by'] ?? ($payload['createdBy'] ?? 'Admin'));

        if (!$id || !$name) {
            $this->jsonError('ID / Kode dan Nama kartu wajib diisi');
        }

        // Jika image berisi data base64, simpan fisik ke assets/images/cards/
        if (!empty($image) && (strpos($image, 'data:image/') === 0 || strlen($image) > 500)) {
            $image = $this->saveImageAsWebp($id, $image);
        }

        $stmt = $this->pdo->prepare("INSERT INTO `cards_master` 
            (`id`, `name`, `grade`, `set_name`, `language`, `nation`, `power`, `shield`, `image`, `created_by`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                `name` = VALUES(`name`),
                `grade` = VALUES(`grade`),
                `set_name` = VALUES(`set_name`),
                `language` = VALUES(`language`),
                `nation` = VALUES(`nation`),
                `power` = VALUES(`power`),
                `shield` = VALUES(`shield`),
                `image` = VALUES(`image`),
                `updated_at` = CURRENT_TIMESTAMP");
        $stmt->execute([$id, $name, $grade, $set, $language, $nation, $power, $shield, $image, $createdBy]);

        $this->jsonSuccess([
            'id'        => $id,
            'name'      => $name,
            'grade'     => $grade,
            'set'       => $set,
            'language'  => $language,
            'nation'    => $nation,
            'power'     => $power,
            'shield'    => $shield,
            'image'     => $image,
            'createdBy' => $createdBy
        ]);
    }

    public function deleteMasterCard($payload) {
        $this->ensureCardsMasterTable();
        $id = trim($payload['id'] ?? '');
        if (!$id) {
            $this->jsonError('ID kartu wajib diisi');
        }
        $stmt = $this->pdo->prepare("DELETE FROM `cards_master` WHERE `id` = ?");
        $stmt->execute([$id]);
        $this->jsonSuccess(true);
    }

    public function getInventory() {
        $stmt = $this->pdo->query("SELECT 
            id, 
            IFNULL(name, '') AS `name`, 
            IFNULL(grade, '') AS `grade`, 
            IFNULL(set_name, '') AS `set`, 
            IFNULL(type, 'JP') AS `type`, 
            IFNULL(nation, '') AS `nation`, 
            IFNULL(owner, '') AS `owner`, 
            IFNULL(date, '') AS `date`, 
            IFNULL(status, 'Available') AS `status`, 
            IFNULL(buyer, '') AS `buyer`, 
            IFNULL(price, 0) AS `price`, 
            IFNULL(sold_date, '') AS `soldDate`, 
            IFNULL(ship_date, '') AS `shipDate`, 
            IFNULL(tracking_number, '') AS `trackingNumber`, 
            IFNULL(commission, 0) AS `commission`, 
            IFNULL(commission, 0) AS `Komisi`, 
            IFNULL(payout_date, '') AS `payoutDate`, 
            IFNULL(payout_proof_url, '') AS `payoutProofUrl`, 
            IFNULL(image, '') AS `image`,
            IFNULL(created_by, '') AS `createdBy`,
            IFNULL(created_by, '') AS `created_by`,
            IFNULL(created_at, '') AS `createdAt`
        FROM inventory 
        ORDER BY created_at DESC, id DESC");
        $rows = $stmt->fetchAll();

        // Cast numeric fields properly
        foreach ($rows as &$r) {
            $r['price'] = $r['price'] !== null && $r['price'] !== '' ? (float)$r['price'] : 0;
            $r['commission'] = $r['commission'] !== null && $r['commission'] !== '' ? (float)$r['commission'] : 0;
            $r['Komisi'] = $r['commission'];
        }
        $this->jsonSuccess($rows);
    }

    
    /**
     * Konversi dan simpan file gambar fisik ke assets/images/cards/{cleanId}.webp
     */
    private function saveImageAsWebp($cardId, $imageData) {
        if (empty($imageData) || empty($cardId)) {
            return '';
        }

        // Sanitasi nama file kartu (hanya huruf, angka, minus, underscore)
        $cleanId = preg_replace('/[^\w\-]/', '_', $cardId);
        $cleanId = trim($cleanId, '_');
        if (empty($cleanId)) {
            $cleanId = 'card_' . time();
        }
        $fileName = $cleanId . '.webp';

        $targetDir = realpath(__DIR__ . '/../assets/images/cards');
        if (!$targetDir) {
            $targetDir = __DIR__ . '/../assets/images/cards';
            if (!is_dir($targetDir)) {
                @mkdir($targetDir, 0777, true);
            }
        }
        $targetPath = rtrim($targetDir, '/\\') . DIRECTORY_SEPARATOR . $fileName;

        // Ambil data binary dari data URI atau base64
        $binaryData = '';
        if (strpos($imageData, 'data:') === 0) {
            $parts = explode(',', $imageData, 2);
            if (count($parts) === 2) {
                $binaryData = base64_decode($parts[1]);
            }
        } else if (base64_decode($imageData, true) !== false && strlen($imageData) > 100) {
            $binaryData = base64_decode($imageData);
        }

        if (empty($binaryData)) {
            return $imageData;
        }

        // Cek apakah data biner sudah format WebP (header RIFF....WEBP)
        $isWebP = (substr($binaryData, 0, 4) === 'RIFF' && substr($binaryData, 8, 4) === 'WEBP');

        if ($isWebP) {
            @file_put_contents($targetPath, $binaryData);
            return $fileName;
        }

        // Jika gambar PNG / JPG / format lain, gunakan GD untuk convert ke WebP
        if (function_exists('imagecreatefromstring') && function_exists('imagewebp')) {
            $im = @imagecreatefromstring($binaryData);
            if ($im !== false) {
                imagealphablending($im, true);
                imagesavealpha($im, true);
                @imagewebp($im, $targetPath, 85);
                @imagedestroy($im);
                return $fileName;
            }
        }

        @file_put_contents($targetPath, $binaryData);
        return $fileName;
    }

    public function uploadCardImage($payload) {
        $cardId    = trim($payload['cardId'] ?? ($payload['id'] ?? ''));
        $imageData = $payload['image_base64'] ?? ($payload['image'] ?? ($payload['dataUrl'] ?? ''));

        if (!$cardId) {
            $this->jsonError('ID / Kode kartu wajib diisi');
        }
        if (!$imageData) {
            $this->jsonError('Data gambar base64 wajib dikirim');
        }

        $fileName = $this->saveImageAsWebp($cardId, $imageData);
        if (!$fileName) {
            $this->jsonError('Gagal memproses gambar kartu');
        }

        $this->jsonSuccess([
            'image' => $fileName,
            'url'   => 'assets/images/cards/' . $fileName
        ]);
    }

    
    public function searchWiki($payload) {
        $code   = trim($payload['code'] ?? '');
        $jpName = trim($payload['jpName'] ?? '');

        if (!$code && !$jpName) {
            $this->jsonError('Kode atau nama kartu wajib diisi');
        }

        $opts = [
            'http' => [
                'method'  => 'GET',
                'header'  => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\nAccept: application/json\r\n",
                'timeout' => 8
            ],
            'ssl' => [
                'verify_peer'      => false,
                'verify_peer_name' => false
            ]
        ];
        $context = stream_context_create($opts);

        $searchHits = [];
        if ($code) {
            $searchUrl = "https://cardfight.fandom.com/api.php?action=query&list=search&srsearch=" . urlencode($code) . "&format=json";
            $res = @file_get_contents($searchUrl, false, $context);
            if ($res) {
                $json = json_decode($res, true);
                $searchHits = $json['query']['search'] ?? [];
            }
        }

        $cardHit = null;
        foreach ($searchHits as $h) {
            $t = $h['title'] ?? '';
            $tLower = strtolower($t);
            if (strpos($tLower, 'list of') === false && strpos($t, 'Card Gallery:') !== 0 && strpos($t, 'File:') !== 0) {
                $cardHit = $h;
                break;
            }
        }

        if (!$cardHit && $jpName) {
            $searchUrlJp = "https://cardfight.fandom.com/api.php?action=query&list=search&srsearch=" . urlencode($jpName) . "&format=json";
            $resJp = @file_get_contents($searchUrlJp, false, $context);
            if ($resJp) {
                $jsonJp = json_decode($resJp, true);
                $hitsJp = $jsonJp['query']['search'] ?? [];
                foreach ($hitsJp as $h) {
                    $t = $h['title'] ?? '';
                    $tLower = strtolower($t);
                    if (strpos($tLower, 'list of') === false && strpos($t, 'Card Gallery:') !== 0 && strpos($t, 'File:') !== 0) {
                        $cardHit = $h;
                        break;
                    }
                }
            }
        }

        if (!$cardHit) {
            $this->jsonError('Data kartu tidak ditemukan di Fandom Wiki');
        }

        $pageTitle = $cardHit['title'];
        $parseUrl = "https://cardfight.fandom.com/api.php?action=parse&page=" . urlencode($pageTitle) . "&prop=wikitext&format=json";
        $parseRes = @file_get_contents($parseUrl, false, $context);
        $wikitext = '';
        if ($parseRes) {
            $parseJson = json_decode($parseRes, true);
            $wikitext = $parseJson['parse']['wikitext']['*'] ?? '';
        }

        $matchVal = function($key) use ($wikitext) {
            if (preg_match('/\|\s*' . preg_quote($key, '/') . '\s*=\s*(.*?)(?=\n\||\n\}\}|$)/i', $wikitext, $m)) {
                return trim($m[1]);
            }
            return '';
        };

        $this->jsonSuccess([
            'title'  => $pageTitle,
            'grade'  => $matchVal('grade'),
            'nation' => $matchVal('nation'),
            'power'  => $matchVal('power'),
            'shield' => $matchVal('shield')
        ]);
    }

    public function saveCard($payload) {
        $id        = trim($payload['id'] ?? '');
        $name      = trim($payload['name'] ?? '');
        $grade     = trim((string)($payload['grade'] ?? '3'));
        $set       = trim($payload['set'] ?? ($payload['set_name'] ?? ''));
        $type      = strtoupper(trim($payload['type'] ?? 'JP'));
        $nation    = trim($payload['nation'] ?? '');
        $owner     = trim($payload['owner'] ?? '');
        $date      = !empty($payload['date']) ? $payload['date'] : date('Y-m-d');
        $image     = trim($payload['image'] ?? '');
        $status    = trim($payload['status'] ?? 'Available');
        $createdBy = trim($payload['created_by'] ?? ($payload['createdBy'] ?? ($payload['added_by'] ?? '')));

        if (!$name) {
            $this->jsonError('Nama kartu wajib diisi');
        }

        // Simpan gambar fisik WebP jika input berupa base64 data URI
        if (!empty($image) && (strpos($image, 'data:image/') === 0 || strlen($image) > 500)) {
            $tempId = !empty($id) ? $id : (!empty($payload['card_code']) ? $payload['card_code'] : ('card_' . time()));
            $image = $this->saveImageAsWebp($tempId, $image);
        }

        if ($id) {
            // Update
            $stmt = $this->pdo->prepare("UPDATE inventory SET 
                name = ?, 
                grade = ?, 
                set_name = ?, 
                type = ?, 
                nation = ?, 
                owner = ?, 
                date = ?, 
                image = ?
                WHERE id = ?");
            $stmt->execute([$name, $grade, $set, $type, $nation, $owner, $date, $image, $id]);

            $this->jsonSuccess([
                'id'         => $id,
                'name'       => $name,
                'grade'      => $grade,
                'set'        => $set,
                'type'       => $type,
                'nation'     => $nation,
                'owner'      => $owner,
                'date'       => $date,
                'status'     => $status,
                'image'      => $image,
                'created_by' => $createdBy
            ]);
        } else {
            // Generate unique ID
            $newId = 'C' . substr(str_pad(mt_rand(10000, 99999), 5, '0', STR_PAD_LEFT), -5);
            $chk = $this->pdo->prepare("SELECT id FROM inventory WHERE id = ?");
            $chk->execute([$newId]);
            if ($chk->fetch()) {
                $newId = 'C' . substr((string)round(microtime(true) * 1000), -5);
            }

            $stmt = $this->pdo->prepare("INSERT INTO inventory 
                (id, name, grade, set_name, type, nation, owner, date, status, image, created_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?)");
            $stmt->execute([$newId, $name, $grade, $set, $type, $nation, $owner, $date, $image, $createdBy]);
            try {
                $user = !empty($createdBy) ? $createdBy : 'Admin';
                $logStmt = $this->pdo->prepare("INSERT INTO activity_logs (activity, user_name, card_id) VALUES (?, ?, ?)");
                $logStmt->execute(["Input Kartu: " . $name . " (" . $owner . ")", $user, $newId]);
            } catch (\Exception $e) {}

            $this->jsonSuccess([
                'id'         => $newId,
                'name'       => $name,
                'grade'      => $grade,
                'set'        => $set,
                'type'       => $type,
                'nation'     => $nation,
                'owner'      => $owner,
                'date'       => $date,
                'status'     => 'Available',
                'image'      => $image,
                'created_by' => $createdBy
            ]);
        }
    }

    public function deleteCard($payload) {
        $id = trim($payload['id'] ?? '');
        if (!$id) {
            $this->jsonError('ID kartu wajib diisi');
        }
        $stmt = $this->pdo->prepare("DELETE FROM inventory WHERE id = ?");
        $stmt->execute([$id]);
        $this->jsonSuccess(true);
    }

    public function updateCardStatus($payload) {
        $id     = trim($payload['id'] ?? '');
        $status = trim($payload['status'] ?? '');
        $extra  = $payload['extra'] ?? [];

        if (!$id) {
            $this->jsonError('ID kartu wajib diisi');
        }

        $fields = [];
        $values = [];

        if ($status !== '') {
            $fields[] = "`status` = ?";
            $values[] = $status;
        }

        if (isset($extra['buyer'])) {
            $fields[] = "`buyer` = ?";
            $values[] = trim($extra['buyer']);
        }
        if (isset($extra['price'])) {
            $fields[] = "`price` = ?";
            $values[] = (float)$extra['price'];
        }
        if (isset($extra['soldDate'])) {
            $fields[] = "`sold_date` = ?";
            $values[] = !empty($extra['soldDate']) ? $extra['soldDate'] : null;
        }
        if (isset($extra['shipDate'])) {
            $fields[] = "`ship_date` = ?";
            $values[] = !empty($extra['shipDate']) ? $extra['shipDate'] : null;
        }
        if (isset($extra['trackingNumber'])) {
            $fields[] = "`tracking_number` = ?";
            $values[] = trim($extra['trackingNumber']);
        }
        if (isset($extra['payoutDate'])) {
            $fields[] = "`payout_date` = ?";
            $values[] = !empty($extra['payoutDate']) ? $extra['payoutDate'] : null;
        }
        if (isset($extra['payoutProofUrl'])) {
            $fields[] = "`payout_proof_url` = ?";
            $values[] = trim($extra['payoutProofUrl']);
        }
        if (isset($extra['commission'])) {
            $fields[] = "`commission` = ?";
            $values[] = (float)$extra['commission'];
        }

        if (empty($fields)) {
            $this->jsonSuccess(true);
        }

        $values[] = $id;
        $sql = "UPDATE inventory SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        try {
            $logStmt = $this->pdo->prepare("INSERT INTO activity_logs (activity, user_name, card_id) VALUES (?, ?, ?)");
            $logStmt->execute(["Update Status: " . $id . " -> " . $status, 'Admin', $id]);
        } catch (\Exception $e) {}

        $this->jsonSuccess(true);
    }

    public function batchUpdateCardStatus($payload) {
        $ids    = $payload['ids'] ?? [];
        $status = trim($payload['status'] ?? '');
        $extra  = $payload['extra'] ?? [];

        if (empty($ids) || !is_array($ids)) {
            $this->jsonSuccess(['updated' => 0]);
        }

        $fields = [];
        $values = [];

        if ($status !== '') {
            $fields[] = "`status` = ?";
            $values[] = $status;
        }
        if (isset($extra['shipDate'])) {
            $fields[] = "`ship_date` = ?";
            $values[] = !empty($extra['shipDate']) ? $extra['shipDate'] : null;
        }
        if (isset($extra['trackingNumber'])) {
            $fields[] = "`tracking_number` = ?";
            $values[] = trim($extra['trackingNumber']);
        }
        if (isset($extra['payoutDate'])) {
            $fields[] = "`payout_date` = ?";
            $values[] = !empty($extra['payoutDate']) ? $extra['payoutDate'] : null;
        }
        if (isset($extra['payoutProofUrl'])) {
            $fields[] = "`payout_proof_url` = ?";
            $values[] = trim($extra['payoutProofUrl']);
        }
        if (isset($extra['commission'])) {
            $fields[] = "`commission` = ?";
            $values[] = (float)$extra['commission'];
        }

        if (empty($fields)) {
            $this->jsonSuccess(['updated' => 0]);
        }

        $inPlaceholders = implode(',', array_fill(0, count($ids), '?'));
        $sql = "UPDATE inventory SET " . implode(', ', $fields) . " WHERE id IN ($inPlaceholders)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_merge($values, array_values($ids)));

        $this->jsonSuccess(['updated' => $stmt->rowCount()]);
    }
}
