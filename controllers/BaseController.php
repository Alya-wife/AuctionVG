<?php
/**
 * BaseController - NitipPro Vanguard Card Inventory
 * Menyediakan fungsionalitas umum untuk semua controller.
 */

class BaseController {
    /** @var PDO */
    protected $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Mengirim respon JSON sukses
     */
    protected function jsonSuccess($data = null) {
        echo json_encode([
            'status' => 'success',
            'data'   => $data
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Mengirim respon JSON error
     */
    protected function jsonError($message, $code = 400) {
        http_response_code($code);
        echo json_encode([
            'status'  => 'error',
            'message' => $message
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
