# LENTERA POS — Multi-Item Shopping v1.6

Tujuan: setiap tantangan kasir menampilkan keranjang 2–5 jenis barang lengkap dengan foto produk, jumlah, harga satuan, subtotal, total belanja dan pembayaran. Semua aktivitas adalah simulasi tanpa potongan stok atau transaksi asli.

## Progres lima pelanggan
- Tahap 1: 2 jenis produk × 1 per jenis.
- Tahap 2: 3 jenis produk × 1 per jenis.
- Tahap 3: 3 jenis produk × 1–2 per jenis.
- Tahap 4: 4 jenis produk × 1–2 per jenis.
- Tahap 5: 5 jenis produk × 1–3 per jenis.

Tahap pesanan mengikuti nomor pelanggan 1–5, bukan level XP. Ini menjamin peningkatan kesulitan dalam satu sesi meskipun XP belum cukup untuk naik level.

## Integrasi
- /simulasi: keranjang visual tampil pada scene toko, dengan foto produk dari katalog Cloudinary, nama, jumlah dan subtotal.
- Desktop: semua produk ditampilkan dalam panel keranjang yang dapat scroll sendiri jika diperlukan.
- HP: dua produk pertama tampak di scene, semua produk tetap lengkap di drawer uang.
- Kalkulator pengurangan otomatis menggunakan total seluruh keranjang dan uang pelanggan.
- Laci uang tetap menilai nominal kembalian total; skor/XP melalui API game Neon yang sama.
- /game: Kasir Pintar berbasis pilihan angka juga menampilkan keranjang multi-produk.
- Soal versi lama (satu item) tetap terbaca dengan normal.

## Backend dan database
- Migration: db/004_game_multi_item.sql. Menambah kolom items JSONB nullable ke tabel lentera_game_challenges. Constraint maksimal 5 item.
- Snapshot barang, harga dan gambar disimpan pada challenge baru. Refresh tidak merandom ulang isi keranjang.
- Worker hanya SELECT katalog produk dan INSERT soal latihan. Tidak ada perubahan ke produk, stok, stock_movements, transaksi atau checkout nyata.
- Jika katalog kurang dari lima jenis, sistem menggunakan item latihan bawaan yang tidak mengurangi stok.
- Uang kembalian selalu bersifat nominal integer kelipatan Rp100.

## File
- worker/multiItem.js
- worker/game.js
- src/simulation/BasketList.jsx
- src/simulation/basket.css
- src/simulation/VisualCustomerPage.jsx
- src/GamePage.jsx
- src/multi-item-shopping.test.mjs
- public/sw.js (offline cache v13)

## Uji
1. npm test, npm run build, npm run build:cloud.
2. Deploy sesudah migrasi database diterapkan.
3. Coba /simulasi untuk lima pelanggan, 2/3/3/4/5 jenis barang.
4. Pastikan total belanja = jumlah subtotal setiap item dan kalkulator memakai total tersebut.
5. Coba uang interaktif, jawaban salah/benar, skor dan XP, lanjut pelanggan.
6. Refresh pada soal aktif: seluruh isi keranjang harus tetap sama.
7. Cek desktop 1024px–1440px dan HP 320px–430px.
8. Stok dan transaksi asli tidak berubah setelah bermain.

Build otomatis tidak menjamin tampilan visual live; cek sesudah Cloudflare deploy.
