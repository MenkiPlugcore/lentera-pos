# LENTERA Smart Cafe & Kasir Pintar (MVP)

Fitur ini memakai Cloudflare Worker + Neon `lentera-pos-tkj`, tanpa plugin tambahan atau perubahan data POS lama.

## Akses
- `/cafe` — tab Kasir/Pesanan, Barista/Dapur, Pelayan/Antar.
- `/game` — Kasir Pintar, latihan kembalian 5 pelanggan virtual, poin, XP, level dan riwayat.
- Halaman tetap **membutuhkan login admin**. Untuk rilis siswa mandiri, perlu fitur akun/kode sesi yang dibatasi dahulu.
- Antrean cafe memuat ulang data setiap 10 detik (**polling**, belum WebSocket realtime).
- UI latihan didesain tombol besar dan pilihan jawaban untuk siswa yang perlu dukungan visual.

## Alur kafe (transaksi sungguhan)
1. Kasir pilih produk dan nomor meja, lalu buat pesanan `pending`. Pada tahap ini stok belum berkurang.
2. Kasir terima pembayaran. Neon menjalankan `lentera_cafe_pay`, yang mengunci pesanan, memanggil `lentera_pos_checkout`, mencatat transaksi asli, dan memotong stok sekali.
3. Setelah dibayar, tab barista mengubah status `pending → preparing → ready`.
4. Pelayan mengubah status `ready → served`.
5. Pesanan yang belum dibayar dapat dibatalkan. Pesanan yang sudah dibayar tidak dapat dibatalkan di antrean tanpa alur refund khusus.

**Catatan:** Harga pada pesanan adalah snapshot saat dibuat. Jika harga di menu berubah sebelum dibayar, pembayaran ditolak dan perlu membuat pesanan baru supaya nilai yang ditagihkan tidak berubah diam-diam. Jangan gunakan pesanan uji di produksi jika tidak ingin transaksi kasir sungguhan tercatat.

## Mode game (hanya latihan)
- Pilih nama panggilan siswa, tidak perlu data pribadi.
- Game mengambil nama dan harga dari menu aktif sebagai inspirasi soal.
- Setiap soal: pembelian 1–3 item, nominal diterima, pilih kembalian benar.
- Jawaban dinilai dan poin disimpan di server, maksimal 3 percobaan.
- 5 soal menutup sesi. Skor dan XP disimpan di tabel `lentera_game_sessions`, `lentera_game_challenges`, `lentera_game_attempts`.
- Tidak ada checkout dan tidak ada perubahan `products.stock` maupun `transactions` untuk aktivitas game.

## Endpoints admin
- GET/POST `/api/cafe/orders`
- POST `/api/cafe/orders/:id/pay`
- POST `/api/cafe/orders/:id/status` status `preparing|ready|served|cancelled`
- GET/POST `/api/game/sessions`
- POST `/api/game/challenge`
- POST `/api/game/answer`
- GET `/api/game/summary`

## Deployment
1. Migration `db/002_cafe_game.sql` diterapkan **secara additive** ke Neon yang sudah ada.
2. Pastikan semua tes `npm test` dan build cloud lolos.
3. Deploy commit terbaru lewat Cloudflare Git Integration atau `npm run deploy:cloud`.
4. Login di `https://pos.cadera.site/admin`, lalu buka `/cafe` dan `/game`.
5. Uji game terlebih dahulu (aman bagi stok). Saat menguji kafe, buat transaksi nyata hanya jika memang diizinkan.

## Langkah lanjut
Akun/kode akses siswa per kelas, kontrol barista/pelayan tanpa hak admin penuh, notifikasi pesanan realtime, stok bahan/resep, gamifikasi 3 peran, dan laporan capaian pembelajaran guru.
