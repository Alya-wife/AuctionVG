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
