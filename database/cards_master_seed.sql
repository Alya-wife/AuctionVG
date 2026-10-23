-- =======================================================
-- SQL Tabel cards_master untuk phpMyAdmin Hosting
-- =======================================================

CREATE TABLE IF NOT EXISTS `cards_master` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Masukkan data awal kartu master katalog
INSERT IGNORE INTO `cards_master` 
(`id`, `name`, `grade`, `set_name`, `language`, `nation`, `power`, `shield`, `image`, `created_by`) VALUES
('D-PR-001', 'Chakrabarthi True Dragon, Mahar Nirvana', '3', 'D-PR 2024 Promo Series', 'JP', 'Dragon Empire', '', '', 'D-PR-001.jpg', 'System'),
('D-PR-002', 'Apex Ruler, Bastion', '3', 'D-PR 2024 Promo Series', 'JP', 'Keter Sanctuary', '', '', 'D-PR-002.jpg', 'System'),
('D-PR-003', 'Diabolos, "Violence" Bruce', '3', 'D-PR 2024 Promo Series', 'EN', 'Dark States', '', '', 'D-PR-003.jpg', 'System'),
('D-PR-004', 'Sylvan Horned Beast King, Magnolia', '3', 'D-PR 2024 Promo Series', 'JP', 'Stoicheia', '', '', 'D-PR-004.jpg', 'System'),
('D-PR-005', 'Aurora Fierce Princess, Seraph Purelight', '4', 'D-PR 2024 Promo Series', 'EN', 'Brandt Gate', '', '', 'D-PR-005.jpg', 'System'),
('D-PR-006', 'Heartfelt Song, Loronerol', '3', 'D-PR 2024 Promo Series', 'JP', 'Lyrical Monasterio', '', '', 'D-PR-006.jpg', 'System'),
('D-PR-007', 'Trickstar', '0', 'D-PR 2024 Promo Series', 'JP', 'Dragon Empire', '', '', 'D-PR-007.jpg', 'System'),
('D-PR-008', 'Knight of Heavenly Bow, Base', '1', 'D-PR 2024 Promo Series', 'JP', 'Keter Sanctuary', '', '', 'D-PR-008.jpg', 'System'),
('V-PR-001', 'Dragonic Overlord', '3', 'V-PR Promo Pack Vol. 1', 'JP', 'Dragon Empire', '', '', 'V-PR-001.jpg', 'System'),
('V-PR-002', 'Blaster Blade', '2', 'V-PR Promo Pack Vol. 1', 'EN', 'Keter Sanctuary', '', '', 'V-PR-002.jpg', 'System'),
('V-PR-003', 'Phantom Blaster Dragon', '3', 'V-PR Promo Pack Vol. 1', 'JP', 'Dark States', '', '', 'V-PR-003.jpg', 'System'),
('V-PR-004', 'Vairina Liber', '2', 'V-PR Promo Pack Vol. 1', 'EN', 'Dragon Empire', '', '', 'V-PR-004.jpg', 'System'),
('V-PR-005', 'Alfred Early', '2', 'V-PR Promo Pack Vol. 1', 'EN', 'Keter Sanctuary', '', '', 'V-PR-005.jpg', 'System'),
('V-PR-006', 'Sylvan Horned Beast, Charis', '1', 'V-PR Promo Pack Vol. 1', 'JP', 'Stoicheia', '', '', 'V-PR-006.jpg', 'System'),
('SHOP-PR-001', 'Dragheart, Luquier', '3', 'Shop Tournament PR 2024', 'JP', 'Dark States', '', '', 'SHOP-PR-001.jpg', 'System'),
('SHOP-PR-002', 'Cardinal Deus, Orfist', '3', 'Shop Tournament PR 2024', 'EN', 'Brandt Gate', '', '', 'SHOP-PR-002.jpg', 'System'),
('SHOP-PR-003', 'Prism Bird', '1', 'Shop Tournament PR 2024', 'JP', 'Lyrical Monasterio', '', '', 'SHOP-PR-003.jpg', 'System'),
('SHOP-PR-004', 'Triglav', '0', 'Shop Tournament PR 2024', 'JP', 'Dragon Empire', '', '', 'SHOP-PR-004.jpg', 'System'),
('VGD-PR-001', 'Youthberk "RevolForm: Gust"', '3', 'Vanguard Day Promo Special', 'JP', 'Keter Sanctuary', '', '', 'VGD-PR-001.jpg', 'System'),
('VGD-PR-002', 'Drajeweled, "Ignis"', '3', 'Vanguard Day Promo Special', 'JP', 'Dark States', '', '', 'VGD-PR-002.jpg', 'System'),
('VGD-PR-003', 'Lianorn "Vivace"', '3', 'Vanguard Day Promo Special', 'EN', 'Stoicheia', '', '', 'VGD-PR-003.jpg', 'System');
