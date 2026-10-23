<?php
/**
 * Database Configuration - NitipPro Vanguard Card Inventory
 * 
 * Pengaturan koneksi MySQL / MariaDB via PDO.
 * Otomatis mendeteksi Localhost vs Server Hosting.
 */

// ==============================================================================
// 1. PENGATURAN DATABASE HOSTING (Ganti dengan detail MySQL dari cPanel / Hosting)
// ==============================================================================
$hosting_host = 'sql306.infinityfree.com';             // Seringkali tetap 'localhost' atau hostname MySQL hosting Anda
$hosting_name = 'if0_43253028_nitip_pro';       // Nama database MySQL di hosting
$hosting_user = 'if0_43253028';       // Username database di hosting
$hosting_pass = 'Ravy2005';   // Password database di hosting

// ==============================================================================
// 2. PENGATURAN LOCALHOST (Laragon / Local Dev)
// ==============================================================================
$local_host   = 'localhost';
$local_name   = 'nitip_pro';
$local_user   = 'root';
$local_pass   = '';

// ==============================================================================
// 3. DETEKSI OTOMATIS LOCALHOST VS HOSTING
// ==============================================================================
$hostHeader = $_SERVER['HTTP_HOST'] ?? '';
$isLocal = (
    strpos($hostHeader, 'localhost') !== false ||
    strpos($hostHeader, '127.0.0.1') !== false ||
    php_sapi_name() === 'cli'
);

if ($isLocal) {
    // Berjalan di Localhost / Laragon
    $db_host = getenv('DB_HOST') ?: $local_host;
    $db_name = getenv('DB_NAME') ?: $local_name;
    $db_user = getenv('DB_USER') ?: $local_user;
    $db_pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : $local_pass;
} else {
    // Berjalan di Server Hosting (cPanel / InfinityFree / ProFreeHost / VPS)
    $db_host = getenv('DB_HOST') ?: $hosting_host;
    $db_name = getenv('DB_NAME') ?: $hosting_name;
    $db_user = getenv('DB_USER') ?: $hosting_user;
    $db_pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : $hosting_pass;
}

try {
    $pdo = new PDO("mysql:host={$db_host};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'error',
        'message' => 'Koneksi Database Gagal: ' . $e->getMessage() . '. Pastikan file config/database.php sudah diisi dengan detail MySQL yang sesuai.'
    ]);
    exit;
}

return $pdo;
