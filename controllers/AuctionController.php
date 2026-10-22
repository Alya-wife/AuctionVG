<?php
/**
 * AuctionController - Menangani pengelolaan lelang kartu
 */

require_once __DIR__ . '/BaseController.php';

class AuctionController extends BaseController {

    public function getAuctions() {
        $stmt = $this->pdo->query("SELECT id, IFNULL(fb_url, '') AS fbUrl, status, IFNULL(date, '') AS `date` FROM auctions ORDER BY date DESC, id DESC");
        $auctions = $stmt->fetchAll();

        if (empty($auctions)) {
            $this->jsonSuccess([]);
        }

        $auctionIds = array_column($auctions, 'id');
        $inPlaceholders = implode(',', array_fill(0, count($auctionIds), '?'));
        
        $itemStmt = $this->pdo->prepare("SELECT auction_id, card_id, sold, IFNULL(buyer, '') AS buyer, IFNULL(price, 0) AS price FROM auction_items WHERE auction_id IN ($inPlaceholders)");
        $itemStmt->execute($auctionIds);
        $allItems = $itemStmt->fetchAll();

        $itemsByAuction = [];
        foreach ($allItems as $it) {
            $itemsByAuction[$it['auction_id']][] = $it;
        }

        foreach ($auctions as &$a) {
            $items = $itemsByAuction[$a['id']] ?? [];
            $a['cardIds'] = array_column($items, 'card_id');
            $a['results'] = [];
            foreach ($items as $it) {
                if ($it['sold']) {
                    $a['results'][] = [
                        'cardId' => $it['card_id'],
                        'sold'   => true,
                        'buyer'  => $it['buyer'],
                        'price'  => (float)$it['price']
                    ];
                }
            }
        }

        $this->jsonSuccess($auctions);
    }

    public function saveAuction($payload) {
        $fbUrl   = trim($payload['fbUrl'] ?? '');
        $cardIds = $payload['cardIds'] ?? [];
        $id      = 'A' . round(microtime(true) * 1000);
        $date    = date('Y-m-d');

        $this->pdo->beginTransaction();
        try {
            // Insert auction
            $stmt = $this->pdo->prepare("INSERT INTO auctions (id, fb_url, status, date) VALUES (?, ?, 'Active', ?)");
            $stmt->execute([$id, $fbUrl, $date]);

            // Insert auction items
            if (!empty($cardIds)) {
                $itemStmt = $this->pdo->prepare("INSERT INTO auction_items (auction_id, card_id, sold, buyer, price) VALUES (?, ?, 0, '', 0)");
                $upCard   = $this->pdo->prepare("UPDATE inventory SET status = 'Auction' WHERE id = ?");

                foreach ($cardIds as $cid) {
                    $itemStmt->execute([$id, $cid]);
                    $upCard->execute([$cid]);
                }
            }

            $this->pdo->commit();
            $this->jsonSuccess([
                'id'      => $id,
                'fbUrl'   => $fbUrl,
                'status'  => 'Active',
                'date'    => $date,
                'cardIds' => $cardIds
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            $this->jsonError($e->getMessage());
        }
    }

    public function finishAuction($payload) {
        $auctionId = trim($payload['auctionId'] ?? '');
        $results   = $payload['results'] ?? [];

        if (!$auctionId) {
            $this->jsonError('Auction ID wajib diisi');
        }

        $this->pdo->beginTransaction();
        try {
            // Mark auction finished
            $stmt = $this->pdo->prepare("UPDATE auctions SET status = 'Finished' WHERE id = ?");
            $stmt->execute([$auctionId]);

            $today        = date('Y-m-d');
            $upItem       = $this->pdo->prepare("UPDATE auction_items SET sold = ?, buyer = ?, price = ? WHERE auction_id = ? AND card_id = ?");
            $upSoldCard   = $this->pdo->prepare("UPDATE inventory SET status = 'Waiting Shipment', buyer = ?, price = ?, sold_date = ? WHERE id = ?");
            $upUnsoldCard = $this->pdo->prepare("UPDATE inventory SET status = 'Available' WHERE id = ?");

            foreach ($results as $r) {
                $cid = $r['cardId'] ?? '';
                if (!$cid) continue;
                $sold  = !empty($r['sold']) ? 1 : 0;
                $buyer = trim($r['buyer'] ?? '');
                $price = (float)($r['price'] ?? 0);

                $upItem->execute([$sold, $buyer, $price, $auctionId, $cid]);

                if ($sold) {
                    $upSoldCard->execute([$buyer, $price, $today, $cid]);
                } else {
                    $upUnsoldCard->execute([$cid]);
                }
            }

            $this->pdo->commit();
            $this->jsonSuccess(true);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            $this->jsonError($e->getMessage());
        }
    }
}
