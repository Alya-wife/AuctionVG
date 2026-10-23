Folder Penyimpanan Gambar Kartu Vanguard
=========================================

1. Otomatisasi Sistem:
   Setiap kali kartu di-scan atau diunggah gambarnya melalui aplikasi (Scan Kartu / Master Kartu / Inventory), sistem akan secara OTOMATIS:
   - Mengonversi gambar ke format .webp yang ringan dan tajam.
   - Menyimpan file fisiknya langsung ke folder server ini: assets/images/cards/{kode_kartu}.webp.

2. Penambahan / Backup Manual:
   Jika Anda atau atasan ingin menaruh atau mengganti file gambar kartu secara manual langsung di server/hosting (lewat File Manager / cPanel / FTP):
   - Taruh file langsung di folder ini: assets/images/cards/
   - Beri nama file sesuai kode/ID kartu, contoh:
     - D-PR-001.webp (atau .png / .jpg)
     - D-PR_1705.webp
     - V-PR-001.webp

3. Placeholder:
   Jika suatu kartu belum memiliki file gambar fisik di folder ini, sistem otomatis menampilkan "placeholder_card.svg" agar tampilan UI tetap rapi dan tidak broken.
