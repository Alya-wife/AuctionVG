<?php
/**
 * Database Configuration - NitipPro Vanguard Card Inventory
 * 
 * Pengaturan koneksi MySQL / MariaDB via PDO.
 * Otomatis mendeteksi environment (Localhost / Laragon vs Hosting ProFreeHost / cPanel).
 */

$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'nitip_pro';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';

// Jika Anda mengunggah ke ProFreeHost / cPanel, isi detail di bawah ini bila tidak menggunakan env:
/*
$db_host = 'sqlXXX.profreehost.com';
$db_name = 'unaux_xxxx_nitippro';
$db_user = 'unaux_xxxx';
$db_pass = 'password_anda';
*/

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
        'message' => 'Koneksi Database Gagal: ' . $e->getMessage() . '. Pastikan file config/database.php sudah diisi dengan detail MySQL yang benar.'
    ]);
    exit;
}

return $pdo;
