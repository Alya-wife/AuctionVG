# Panduan Lengkap Hosting NitipPro ke ProFreeHost (Gratis)

Sistem telah berhasil dimigrasikan dari **Google Sheets & Google Apps Script** ke **Database MySQL & PHP REST API murni**.
Kini tidak ada lagi loading lambat, cold-start 30 detik, ataupun batas limit kuota Google Sheet. Semua query data dieksekusi dalam hitungan **milidetik (< 10 ms)**!

---

## 📁 File Penting yang Sudah Disiapkan

1. **`database/database.sql`**  
   Dump SQL lengkap berisi struktur 4 tabel (`inventory`, `auctions`, `auction_items`, `users`) beserta **seluruh 134 kartu inventaris riil, 7 riwayat lelang, dan data akun**. Siap di-import ke phpMyAdmin.
2. **`config/database.php`** (dan `config.php`)  
   File konfigurasi database MySQL (host, nama database, user, password).
3. **`controllers/`**  
   Folder controller modular: `AuthController.php`, `InventoryController.php`, `AuctionController.php`, `StatsController.php`.
4. **`views/`**  
   Folder tampilan antarmuka web yang rapi dan terorganisir.
5. **`database/`**  
   Folder skrip database dan migration.
6. **`docs/`**  
   Folder dokumentasi sistem dan panduan hosting.
7. **`api.php`**  
   Backend REST API dispatcher cepat & aman menggunakan PHP PDO dan controllers.
8. **`.htaccess`**  
   Proteksi file SQL/script dari akses publik serta kompresi GZIP untuk mempercepat loading di ProFreeHost.
9. **`assets/js/config.js` & `assets/js/api.js`**  
   Sudah disesuaikan untuk langsung memanggil `api.php` secara otomatis.

---

## 🚀 Langkah-Langkah Hosting di ProFreeHost

### Langkah 1: Buat Akun & Website di ProFreeHost
1. Buka [ProFreeHost.com](https://profreehost.com) dan daftar akun gratis (jika belum ada).
2. Di Client Area, klik **"Create New Account"**.
3. Masukkan nama subdomain gratis yang Anda inginkan (misalnya `nitippro.unaux.com` atau `tokokartu.ezyro.com`).
4. Tunggu beberapa saat sampai status akun menjadi **Active**, lalu klik **"Manage"** -> **"Control Panel"** (cPanel).

---

### Langkah 2: Buat Database MySQL di cPanel
1. Di dalam cPanel ProFreeHost, cari menu **"Databases"** dan klik **"MySQL Databases"**.
2. Di bagian **Create New Database**, masukkan nama database (misalnya `nitippro`). Klik **Create Database**.
3. Di halaman yang sama, perhatikan tabel informasi database Anda:
   - **MySQL Hostname**: (Contoh: `sql300.profreehost.com` atau `sql205.epizy.com`)
   - **MySQL Database Name**: (Contoh: `unaux_34567890_nitippro`)
   - **MySQL Username**: (Contoh: `unaux_34567890`)
   - **MySQL Password**: (Sama dengan password akun / cPanel ProFreeHost Anda)
   > 📌 *Catat keempat informasi di atas untuk Langkah 4!*

---

### Langkah 3: Import File `database.sql` via phpMyAdmin
1. Kembali ke halaman utama cPanel ProFreeHost.
2. Cari dan klik menu **"phpMyAdmin"**.
3. Di phpMyAdmin, klik nama database Anda di panel sebelah kiri (misal: `unaux_34567890_nitippro`).
4. Klik tab menu **"Import"** di bagian atas.
5. Klik **"Choose File"** / **"Pilih Berkas"**, lalu pilih file **`database/database.sql`** yang ada di folder project ini.
6. Scroll ke bawah dan klik tombol **"Go"** / **"Kirim"**.
7. Tunggu beberapa detik hingga muncul pesan sukses berwarna hijau:  
   *`Import has been successfully finished, 4 tables created...`*

---

### Langkah 4: Sesuaikan File `config/database.php`
Buka file **`config/database.php`** di teks editor Anda sebelum diupload, lalu ubah baris koneksi sesuai informasi dari Langkah 2:

```php
$db_host = 'sql300.profreehost.com';        // Ganti dengan MySQL Hostname Anda
$db_name = 'unaux_34567890_nitippro';       // Ganti dengan Database Name Anda
$db_user = 'unaux_34567890';                // Ganti dengan MySQL Username Anda
$db_pass = 'PasswordCpanelAnda';            // Ganti dengan Password Anda
```
Simpan file `config/database.php`.

---

### Langkah 5: Upload File ke Folder `htdocs`
Anda bisa mengupload lewat **Online File Manager** di cPanel atau menggunakan **FileZilla FTP**:

#### Opsi A: Lewat File Manager (Browser)
1. Di cPanel ProFreeHost, buka **"Online File Manager"**.
2. Masuk ke folder **`htdocs`** (PERHATIAN: Jangan upload di luar `htdocs`!).
3. Jika ada file default seperti `index2.html` atau `default.php`, hapus file tersebut.
4. Upload semua file dan folder project ini ke dalam `htdocs`:
   - Folder `config/`
   - Folder `controllers/`
   - Folder `views/`
   - Folder `assets/`
   - Folder `card-scanner/`
   - `api.php`
   - `config.php`
   - `index.php`
   - `index.html`
   - `.htaccess`

*(Tips: Anda bisa zip semua file tersebut terlebih dahulu, upload file `.zip` ke `htdocs`, lalu klik kanan dan Extract di File Manager)*.

#### Opsi B: Lewat FTP (FileZilla)
- **Host**: (Lihat FTP Host di cPanel ProFreeHost, misal `ftpupload.net`)
- **Username**: Username cPanel Anda (misal `unaux_34567890`)
- **Password**: Password cPanel Anda
- **Port**: 21
- Masuk ke remote directory `/htdocs` dan upload semua file.

---

### Langkah 6: Uji Coba & Login
1. Buka browser dan kunjungi alamat domain website Anda (misal: `http://nitippro.unaux.com`).
2. Login menggunakan akun default:
   - **Username**: `admin`
   - **Password**: `admin123`
   *(Atau `alya` / `alya123`)*
3. Anda bisa mengganti password atau menambah admin baru kapan saja melalui menu **Kelola Admin** di website!
