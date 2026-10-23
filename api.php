<?php
/**
 * REST API Dispatcher - NitipPro Vanguard Card Inventory
 * Arsitektur Controller-based dengan Database MySQL via PDO.
 */

error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
ini_set('display_errors', '0');

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. Load Database Connection
require_once __DIR__ . '/config/database.php';

// 2. Load Controllers
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/InventoryController.php';
require_once __DIR__ . '/controllers/AuctionController.php';
require_once __DIR__ . '/controllers/StatsController.php';

// Parse Request Payload
$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$action = $payload['action'] ?? ($_GET['action'] ?? '');

if (!$action) {
    echo json_encode([
        'status'  => 'success',
        'data'    => [
            'message' => 'NitipPro Vanguard MySQL Backend API is running smoothly!',
            'time'    => date('Y-m-d H:i:s'),
            'version' => '2.1.0-mvc'
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Inisialisasi Controllers
$authController      = new AuthController($pdo);
$inventoryController = new InventoryController($pdo);
$auctionController   = new AuctionController($pdo);
$statsController     = new StatsController($pdo);

try {
    switch ($action) {
        // --- Auth & Users ---
        case 'login':
            $authController->login($payload);
            break;
        case 'googleLogin':
            $authController->googleLogin($payload);
            break;
        case 'getGoogleConfig':
            $authController->getGoogleConfig();
            break;
        case 'getUsers':
            $authController->getUsers();
            break;
        case 'saveUser':
            $authController->saveUser($payload);
            break;
        case 'deleteUser':
            $authController->deleteUser($payload);
            break;

        // --- Inventory ---
        case 'getInventory':
            $inventoryController->getInventory();
            break;
        case 'searchWiki':
            $inventoryController->searchWiki($payload);
            break;
        case 'uploadCardImage':
            $inventoryController->uploadCardImage($payload);
            break;
        case 'saveCard':
            $inventoryController->saveCard($payload);
            break;
        case 'deleteCard':
            $inventoryController->deleteCard($payload);
            break;
        case 'updateCardStatus':
            $inventoryController->updateCardStatus($payload);
            break;
        case 'batchUpdateCardStatus':
            $inventoryController->batchUpdateCardStatus($payload);
            break;

        // --- Auctions ---
        case 'getAuctions':
            $auctionController->getAuctions();
            break;
        case 'saveAuction':
            $auctionController->saveAuction($payload);
            break;
        case 'finishAuction':
            $auctionController->finishAuction($payload);
            break;

        // --- Dashboard Stats ---
        case 'getStats':
            $statsController->getStats();
            break;
        case 'getActivities':
            $statsController->getActivities();
            break;
        case 'getReceivedDates':
            $statsController->getReceivedDatesSummary();
            break;
        case 'getCardsByDate':
            $statsController->getCardsByDate($payload);
            break;

        default:
            http_response_code(404);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Action tidak dikenali: ' . $action
            ], JSON_UNESCAPED_UNICODE);
            exit;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
