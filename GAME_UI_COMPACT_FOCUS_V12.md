# LENTERA POS — Game UI v1.2: Compact & Focus Mode

## Tujuan perubahan
Menyempurnakan simulasi pelanggan agar siswa dapat melihat pelanggan dan menyiapkan uang tanpa scroll panjang, dengan tampilan lebih ringkas dan dukungan perhatian bertahap.

## Perubahan
- **HUD satu baris:** label pemain disatukan dengan skor/XP; progres 1–5 serta Keluar ditempatkan di kanan. Didesain ulang untuk lebar stage sempit menggunakan CSS container queries sehingga tidak saling menimpa.
- **Ringkasan laci uang:** Pesanan, Total Belanja dan Uang Pelanggan ditampilkan dalam satu ringkasan ringkas di awal panel kanan.
- **Pecahan lebih padat:** uang kertas ditata sampai empat kolom pada desktop, uang koin tetap tiga; gambar uang dari Cloudinary tetap ditampilkan dengan nominal teks. Semua tombol masih dapat disentuh/diakses keyboard.
- **Aksi utama selalu mudah dijangkau:** Total Kembalian dan Serahkan Uang berada pada bilah yang sticky di dalam panel uang. Tombol menjadi hijau kontras saat ada uang yang dipilih.
- **Duplikasi UI dihapus:** judul laci yang berulang, total dua kali, teks panjang dan informasi penjelas yang tidak perlu dihilangkan dalam compact mode.
- **Bantuan opsional:** petunjuk berhitung ditutup secara default; siswa/guru dapat membuka bila diperlukan. Jawaban salah dan percobaan tetap terlihat.
- **Mode Fokus:** sakelar di panel kembalian menyembunyikan bubble dialog tambahan dan informasi XP, serta menyederhanakan elemen bantuan. Tiga informasi penting—pesanan, total belanja, dan uang pelanggan—tetap terlihat.
- **HP:** drawer uang tetap ada, tombol tutup mendapat fokus saat drawer dibuka; Escape bisa menutupnya, dan scroll halaman di belakang drawer dikunci sementara.

## Berkas
- src/simulation/VisualCustomerPage.jsx
- src/simulation/MoneyTray.jsx
- src/simulation/arcade.css
- public/sw.js (cache versi v7)

## Yang tidak diubah
- API game, tabel Neon, XP, skor, logika kembalian, peran pelanggan, gambar uang Cloudinary, transaksi dan stok.
- Akses publik tanpa login admin.

## Pemeriksaan
1. GitHub Actions: npm test, npm run build, npm run build:cloud.
2. Deploy commit terbaru ke Cloudflare.
3. Desktop 1024/1280/1440: pastikan HUD tidak tumpang tindih dan empat pecahan uang kertas bisa muncul sebaris pada panel cukup lebar.
4. HP 320/360/390/430 dan tablet 768: buka/tutup drawer, pilih uang, cek hasil, lalu kembali ke pelanggan.
5. Toggle Mode Fokus saat bermain dan saat drawer terbuka; pastikan semua nominal dan tombol tetap dapat dijangkau.
6. Tes kembalian Rp8.500 dari Rp10.000-Rp1.500 dengan uang kertas Rp5.000+Rp2.000+Rp1.000+koin Rp500.
7. Cek jawaban salah, pengurangan pilihan, status percobaan, kembalian Rp0, tombol pelanggan berikutnya, progres sampai sesi selesai.
8. Jika UI lama masih muncul, refresh agar service worker terbaru aktif.

Catatan: tests dan build otomatis tidak menggantikan pemeriksaan viewport langsung. Lakukan pemeriksaan visual pada browser desktop maupun HP setelah deployment.
