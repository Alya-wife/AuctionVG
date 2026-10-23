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
}
