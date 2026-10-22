<?php
/**
 * StatsController - Menangani statistik ringkasan dashboard
 */

require_once __DIR__ . '/BaseController.php';

class StatsController extends BaseController {

    public function getStats() {
        $stmt = $this->pdo->query("SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available,
            SUM(CASE WHEN status = 'Sold' THEN 1 ELSE 0 END) AS sold,
            SUM(CASE WHEN status = 'Auction' THEN 1 ELSE 0 END) AS auction,
            SUM(CASE WHEN status = 'Waiting Shipment' THEN 1 ELSE 0 END) AS shipment,
            SUM(CASE WHEN status = 'Shipped' THEN 1 ELSE 0 END) AS shipped,
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
            'total'         => (int)($cardStats['total'] ?? 0),
            'available'     => (int)($cardStats['available'] ?? 0),
            'sold'          => (int)($cardStats['sold'] ?? 0),
            'auction'       => (int)($cardStats['auction'] ?? 0),
            'shipment'      => (int)($cardStats['shipment'] ?? 0),
            'shipped'       => (int)($cardStats['shipped'] ?? 0),
            'payment'       => (int)($cardStats['payment'] ?? 0),
            'completed'     => (int)($cardStats['completed'] ?? 0),
            'auctionActive' => (int)($aucStats['auctionActive'] ?? 0),
            'auctionDone'   => (int)($aucStats['auctionDone'] ?? 0),
        ]);
    }
}
