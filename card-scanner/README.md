# Cardfight!! Vanguard Card Scanner (Standalone)

Paket modul mandiri pemindai kartu Cardfight!! Vanguard menggunakan **Local OCR (Tesseract.js - Tanpa AI)**, **Quick Code Search**, serta **Cardfight!! Vanguard Fandom Wiki Auto-Lookup**. (Mendukung mode cadangan opsional Google Gemini Vision AI).

Folder ini sepenuhnya independen dan dapat langsung Anda salin (`copy-paste`) ke proyek lain mana pun (HTML murni, Laravel, React, Vue, Next.js, Node.js, PHP, dll.).

---

## Struktur Folder

```
card-scanner/
├── index.html            # Halaman utama aplikasi pemindai kartu
├── css/
│   └── style.css         # Styling mandiri (Dark mode, glassmorphism, responsive)
├── js/
│   ├── config.js         # Konfigurasi Google Gemini API Key & model AI
│   ├── cards-data.js     # Database lokal kartu (LocalStorage) & konverter WebP
│   └── scanner.js        # Logika OCR Gemini Vision, Wiki Fandom lookup, & form
├── images/
│   ├── sample_card_dpr1705.png  # Sampel kartu Unit (D-PR/1705)
│   ├── sample_order_dpr1662.png # Sampel kartu Blitz Order (D-PR/1662)
│   └── placeholder_card.svg     # Gambar placeholder
└── README.md             # Panduan penggunaan ini
```

---

## Cara Menjalankan

### Opsi 1: Menggunakan Local Server (Direkomendasikan)
Karena fitur kamera dan Web Worker memerlukan konteks HTTP/HTTPS:
- **VS Code:** Klik kanan `index.html` -> **Open with Live Server**.
- **Python:** Buka terminal di dalam folder `card-scanner`, lalu jalankan:
  ```bash
  python -m http.server 3000
  ```
  Akses di browser: `http://localhost:3000`
- **PHP:**
  ```bash
  php -S localhost:3000
  ```
- **Laragon:** Salin folder `card-scanner` ke dalam folder `d:\laragon\www\nama-project\`.

---

## Fitur & Alur Pemindaian

1. **Pemindaian OCR Cerdas (Vision AI):**
   - **Grade (Pojok Kiri Atas):** Mendeteksi angka grade 0, 1, 2, 3, atau 4 (berlaku untuk Unit maupun Order Card).
   - **Kode Kartu (Pojok Kiri Bawah):** Membaca kode kartu (contoh: `D-PR/1705`, `D-PR/1662`, `V-PR/001`, `DZ-BT01/001`).
   - **Nama Kartu Resmi (English):** Jika kartu bertuliskan Jepang (JP), AI secara otomatis menerjemahkan/mencari nama bahasa Inggris resminya.
   - **Integrasi Fandom Wiki:** Jika nama EN belum lengkap, sistem secara otomatis melakukan query background ke [Cardfight!! Vanguard Wiki Fandom](https://cardfight.fandom.com/wiki/) menggunakan kode kartu untuk mengambil nama resmi, grade, dan nation.
   - **Nation (Berdasarkan Warna & Posisi):**
     - Biru Tua / Ungu / Navy = `Dark States`
     - Merah / Crimson = `Dragon Empire`
     - Pink / Magenta = `Lyrical Monasterio`
     - Hijau = `Stoicheia`
     - Abu-abu / Putih = `Brandt Gate`
     - Kuning / Emas = `Keter Sanctuary`
     *(Untuk kartu Order, posisi nation dideteksi di bawah nama kartu)*
   - **Set Promo Otomatis:** Mengelompokkan digit nomor kartu ke dalam set promo yang sesuai (misal: `D-PR/1662` otomatis masuk set `D-PR/1600-1700`).

2. **Otomatis Konversi WebP:**
   - Setiap gambar yang diunggah, didrag-and-drop, atau dipaste (Ctrl+V) langsung dikonversi ke format **WebP** terkompresi berkualitas tinggi agar penyimpanan database sangat ringan dan hemat memori.

3. **Database Lokal & Ekspor:**
   - Kartu yang disimpan masuk ke `localStorage` browser.
   - Tombol **Export JSON** tersedia di bagian header untuk mencadangkan atau memindahkan seluruh data kartu yang telah di-scan.

---

## Cara Mengganti Google Gemini API Key

1. **Lewat Antarmuka Web:**
   Klik tombol **"API Key"** di pojok kanan atas halaman, lalu masukkan API Key Anda. Key akan tersimpan di browser Anda.
2. **Lewat File Konfigurasi:**
   Buka file [`js/config.js`](js/config.js), lalu ubah nilai `GEMINI_API_KEY`:
   ```javascript
   const CONFIG = {
       GEMINI_API_KEY: 'AIzaSy...',
       ...
   };
   ```

---

## Cara Integrasi ke Proyek Lain

Jika Anda ingin memanggil fungsi scanner dari JavaScript aplikasi Anda sendiri:

```javascript
// Mengambil API Key dari config
const apiKey = CONFIG.GEMINI_API_KEY;

// Panggil Gemini Vision API (contoh potongan kode dari scanner.js):
const result = await scanWithGemini(base64Image, 'image/webp', apiKey);
console.log(result.nameEnglish, result.cardCode, result.grade, result.nation);
```
