<?php
/**
 * Migration Script: Google Sheets Data -> MySQL Database & database.sql
 */

$inv = json_decode(file_get_contents(__DIR__ . '/inventory_data.json'), true) ?: [];
$auc = json_decode(file_get_contents(__DIR__ . '/auctions_data.json'), true) ?: [];

echo "Processing " . count($inv) . " cards and " . count($auc) . " auctions...\n";

// Load catalog from cards-data.js to enrich set/grade if available
$cardDb = [];
if (file_exists(__DIR__ . '/assets/js/cards-data.js')) {
    $content = file_get_contents(__DIR__ . '/assets/js/cards-data.js');
    if (preg_match('/DEFAULT_CARD_DATABASE\s*=\s*(\[.*?\]);/s', $content, $m)) {
        $catalog = json_decode($m[1], true);
        if (is_array($catalog)) {
            foreach ($catalog as $c) {
                if (!empty($c['name'])) {
                    $cardDb[trim(strtolower($c['name']))] = $c;
                }
            }
        }
    }
}
echo "Catalog reference cards loaded: " . count($cardDb) . "\n";

$sql = "-- =========================================================\n";
$sql .= "-- NitipPro Vanguard Card Inventory - SQL Database Dump\n";
$sql .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
$sql .= "-- =========================================================\n\n";

$sql .= "SET FOREIGN_KEY_CHECKS = 0;\n";
$sql .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
$sql .= "SET time_zone = \"+00:00\";\n\n";

$sql .= "--\n-- Table structure for table `users`\n--\n";
$sql .= "DROP TABLE IF EXISTS `users`;\n";
$sql .= "CREATE TABLE `users` (\n";
$sql .= "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n";
$sql .= "  `username` VARCHAR(100) NOT NULL UNIQUE,\n";
$sql .= "  `password` VARCHAR(255) NOT NULL,\n";
$sql .= "  `name` VARCHAR(150) NOT NULL,\n";
$sql .= "  `role` VARCHAR(50) NOT NULL DEFAULT 'Admin',\n";
$sql .= "  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n";
$sql .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

$sql .= "--\n-- Table structure for table `inventory`\n--\n";
$sql .= "DROP TABLE IF EXISTS `inventory`;\n";
$sql .= "CREATE TABLE `inventory` (\n";
$sql .= "  `id` VARCHAR(50) NOT NULL PRIMARY KEY,\n";
$sql .= "  `name` VARCHAR(255) NOT NULL,\n";
$sql .= "  `grade` VARCHAR(20) DEFAULT '',\n";
$sql .= "  `set_name` VARCHAR(150) DEFAULT '',\n";
$sql .= "  `type` VARCHAR(20) DEFAULT 'JP',\n";
$sql .= "  `nation` VARCHAR(100) DEFAULT '',\n";
$sql .= "  `owner` VARCHAR(150) NOT NULL DEFAULT '',\n";
$sql .= "  `date` DATE NULL,\n";
$sql .= "  `status` VARCHAR(50) NOT NULL DEFAULT 'Available',\n";
$sql .= "  `buyer` VARCHAR(150) DEFAULT '',\n";
$sql .= "  `price` DECIMAL(12,2) DEFAULT 0,\n";
$sql .= "  `sold_date` DATE NULL,\n";
$sql .= "  `ship_date` DATE NULL,\n";
$sql .= "  `tracking_number` VARCHAR(100) DEFAULT '',\n";
$sql .= "  `commission` DECIMAL(12,2) DEFAULT 0,\n";
$sql .= "  `payout_date` DATE NULL,\n";
$sql .= "  `payout_proof_url` TEXT NULL,\n";
$sql .= "  `image` VARCHAR(255) DEFAULT '',\n";
$sql .= "  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n";
$sql .= "  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n";
$sql .= "  INDEX `idx_status` (`status`),\n";
$sql .= "  INDEX `idx_owner` (`owner`),\n";
$sql .= "  INDEX `idx_buyer` (`buyer`)\n";
$sql .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

$sql .= "--\n-- Table structure for table `auctions`\n--\n";
$sql .= "DROP TABLE IF EXISTS `auctions`;\n";
$sql .= "CREATE TABLE `auctions` (\n";
$sql .= "  `id` VARCHAR(50) NOT NULL PRIMARY KEY,\n";
$sql .= "  `fb_url` TEXT NULL,\n";
$sql .= "  `status` VARCHAR(50) NOT NULL DEFAULT 'Active',\n";
$sql .= "  `date` DATE NULL,\n";
$sql .= "  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n";
$sql .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

$sql .= "--\n-- Table structure for table `auction_items`\n--\n";
$sql .= "DROP TABLE IF EXISTS `auction_items`;\n";
$sql .= "CREATE TABLE `auction_items` (\n";
$sql .= "  `id` INT AUTO_INCREMENT PRIMARY KEY,\n";
$sql .= "  `auction_id` VARCHAR(50) NOT NULL,\n";
$sql .= "  `card_id` VARCHAR(50) NOT NULL,\n";
$sql .= "  `sold` TINYINT(1) NOT NULL DEFAULT 0,\n";
$sql .= "  `buyer` VARCHAR(150) DEFAULT '',\n";
$sql .= "  `price` DECIMAL(12,2) DEFAULT 0,\n";
$sql .= "  INDEX `idx_auction` (`auction_id`),\n";
$sql .= "  INDEX `idx_card` (`card_id`)\n";
$sql .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n";

// Helper escape
function esc($str) {
    if ($str === null || $str === '') return 'NULL';
    return "'" . addslashes(trim((string)$str)) . "'";
}

function num($n) {
    if ($n === null || $n === '') return '0';
    $val = (float)str_replace([',', ' '], ['', ''], (string)$n);
    return is_nan($val) ? '0' : (string)$val;
}

function parseSqlDate($d) {
    if (!$d || trim($d) === '') return 'NULL';
    $d = trim($d);
    // If it's already YYYY-MM-DD
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) return "'$d'";
    // If it's ISO datetime
    if (preg_match('/^(\d{4}-\d{2}-\d{2})T/', $d, $m)) return "'{$m[1]}'";
    $time = strtotime($d);
    if ($time && $time > 0) return "'" . date('Y-m-d', $time) . "'";
    return 'NULL';
}

// 1. Insert Default Users
$sql .= "--\n-- Dumping data for table `users`\n--\n";
$sql .= "INSERT INTO `users` (`id`, `username`, `password`, `name`, `role`) VALUES\n";
$sql .= "(1, 'admin', 'admin123', 'Pacar Alya', 'Pacar Alya'),\n";
$sql .= "(2, 'alya', 'alya123', 'Alya', 'Owner');\n\n";

// 2. Insert Inventory
$sql .= "--\n-- Dumping data for table `inventory`\n--\n";
$invRows = [];
foreach ($inv as $row) {
    $id = trim($row['id'] ?? '');
    if (!$id) continue;
    
    $name = trim($row['name'] ?? '');
    $matched = $cardDb[strtolower($name)] ?? null;
    
    $grade = $row['grade'] ?? ($matched['grade'] ?? '3');
    $setName = $row['set'] ?? ($row['set_name'] ?? ($matched['set'] ?? ''));
    $type = $row['type'] ?? ($matched['language'] ?? 'JP');
    if ($row['image'] === 'JP' || $row['image'] === 'EN') {
        $type = $row['image'];
    }
    $nation = $row['nation'] ?? ($matched['nation'] ?? '');
    $owner = $row['owner'] ?? '';
    $date = parseSqlDate($row['date'] ?? null);
    $status = $row['status'] ?: 'Available';
    $buyer = $row['buyer'] ?? '';
    $price = num($row['price'] ?? 0);
    $soldDate = parseSqlDate($row['soldDate'] ?? null);
    $shipDate = parseSqlDate($row['shipDate'] ?? null);
    $tracking = $row['trackingNumber'] ?? '';
    $commission = num($row['Komisi'] ?? ($row['komisi'] ?? 0));
    $payoutDate = parseSqlDate($row['payoutDate'] ?? null);
    $payoutProofUrl = $row['payoutProofUrl'] ?? '';
    $image = $row['image'] ?? ($matched['image'] ?? '');
    if ($image === 'JP' || $image === 'EN') {
        $image = $matched['image'] ?? '';
    }

    $invRows[] = sprintf(
        "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        esc($id), esc($name), esc($grade), esc($setName), esc($type), esc($nation),
        esc($owner), $date, esc($status), esc($buyer), $price,
        $soldDate, $shipDate, esc($tracking), $commission, $payoutDate, esc($payoutProofUrl), esc($image)
    );
}

if (!empty($invRows)) {
    $sql .= "INSERT INTO `inventory` (`id`, `name`, `grade`, `set_name`, `type`, `nation`, `owner`, `date`, `status`, `buyer`, `price`, `sold_date`, `ship_date`, `tracking_number`, `commission`, `payout_date`, `payout_proof_url`, `image`) VALUES\n";
    $sql .= implode(",\n", $invRows) . ";\n\n";
}

// 3. Insert Auctions & Auction Items
$sql .= "--\n-- Dumping data for table `auctions` and `auction_items`\n--\n";
$aucRows = [];
$aucItemRows = [];

foreach ($auc as $a) {
    $aid = trim($a['id'] ?? '');
    if (!$aid) continue;
    $fbUrl = $a['fbUrl'] ?? '';
    $aStatus = $a['status'] ?? 'Active';
    $aDate = parseSqlDate($a['date'] ?? null);

    $aucRows[] = sprintf("(%s, %s, %s, %s)", esc($aid), esc($fbUrl), esc($aStatus), $aDate);

    $cardIds = $a['cardIds'] ?? [];
    $results = [];
    if (!empty($a['results'])) {
        foreach ($a['results'] as $r) {
            $results[$r['cardId']] = $r;
        }
    }

    foreach ($cardIds as $cid) {
        $r = $results[$cid] ?? null;
        $isSold = ($r && !empty($r['sold'])) ? 1 : 0;
        $buyer = $r['buyer'] ?? '';
        $price = num($r['price'] ?? 0);
        $aucItemRows[] = sprintf("(%s, %s, %d, %s, %s)", esc($aid), esc($cid), $isSold, esc($buyer), $price);
    }
}

if (!empty($aucRows)) {
    $sql .= "INSERT INTO `auctions` (`id`, `fb_url`, `status`, `date`) VALUES\n";
    $sql .= implode(",\n", $aucRows) . ";\n\n";
}

if (!empty($aucItemRows)) {
    $sql .= "INSERT INTO `auction_items` (`auction_id`, `card_id`, `sold`, `buyer`, `price`) VALUES\n";
    $sql .= implode(",\n", $aucItemRows) . ";\n\n";
}

$sql .= "SET FOREIGN_KEY_CHECKS = 1;\n";

file_put_contents(__DIR__ . '/database.sql', $sql);
echo "Successfully generated database.sql (" . strlen($sql) . " bytes)!\n";

// Execute directly on local MySQL database 'nitip_pro'
try {
    $pdo = new PDO("mysql:host=localhost", "root", "", [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `nitip_pro` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    $pdo->exec("USE `nitip_pro`;");
    $pdo->exec($sql);
    echo "Successfully imported to local MySQL database 'nitip_pro'!\n";

    $stmt = $pdo->query("SELECT COUNT(*) FROM inventory");
    echo "Local MySQL inventory row count: " . $stmt->fetchColumn() . "\n";
    $stmt = $pdo->query("SELECT COUNT(*) FROM auctions");
    echo "Local MySQL auctions row count: " . $stmt->fetchColumn() . "\n";
    $stmt = $pdo->query("SELECT COUNT(*) FROM users");
    echo "Local MySQL users row count: " . $stmt->fetchColumn() . "\n";
} catch (Exception $e) {
    echo "Local MySQL import notice: " . $e->getMessage() . "\n";
}
