# LENTERA POS — Website Umum, Gambar Uang & Stok Otomatis

## Akses setelah perubahan
- / — beranda publik dan katalog contoh (nama produk, harga jual, gambar).
- /simulasi — pelanggan virtual dan uang interaktif, publik tanpa login admin.
- /game — game kembalian, publik tanpa login admin.
- /admin — login admin dan seluruh pengaturan.
- /kasir dan /cafe — tetap butuh login admin karena membuat penjualan dan mengubah stok.

API publik:
- GET /api/public/catalog (tanpa harga beli dan stok).
- GET /api/public/money (pecahan dan URL gambar unggahan admin).
- API game menerima cookie pengunjung khusus, tanpa memberi izin kasir atau admin.

Setiap browser pengunjung memperoleh cookie __Host-lentera_guest yang HttpOnly, Secure, SameSite=Lax. Neon menyimpan SHA-256 hash token dan owner per sesi game. Pengunjung hanya bisa melihat dan melanjutkan sesi sendiri; admin boleh memantau semua sesi. Batas awal 100 sesi baru per cookie dalam 24 jam. Aktifkan WAF/rate limit Cloudflare bila situs ramai; ganti cookie masih bisa melewati pembatas tingkat cookie.

## Upload gambar uang dan koin
1. Login di /admin.
2. Temukan panel Gambar Uang & Koin · Cloudinary.
3. Upload gambar JPG/PNG/WebP untuk setiap pecahan: Rp100, Rp200, Rp500, Rp1.000, Rp2.000, Rp5.000, Rp10.000, Rp20.000, Rp50.000, Rp100.000.
4. Gambar dikompresi browser lalu diunggah oleh Worker terautentikasi ke folder lentera-pos/money.
5. Neon menyimpan image_url untuk setiap nominal dalam tabel lentera_money_media.
6. Pengunjung melihat foto yang diunggah admin di /simulasi. Jika belum ada gambar, UI menggunakan ilustrasi bawaan.
7. Tombol Gunakan Ilustrasi Bawaan mengosongkan URL di Neon, tetapi tidak menghapus file Cloudinary fisik.

API Secret Cloudinary tidak boleh disimpan di frontend atau repository publik. Upload ditandatangani server Worker dan memvalidasi folder khusus produk atau uang.

## Auto-restock produk
Bagian Isi Ulang Stok Otomatis ada di admin dan NONAKTIF secara default. Jumlah restock dapat diatur 1–1.000 unit, default 20.

Jika diaktifkan:
- Checkout kasir atau Smart Cafe dengan stok tidak cukup otomatis menambah unit kelipatan jumlah restock.
- Jika setelah penjualan stok tepat menjadi nol, stok langsung diisi lagi.
- Setiap penambahan dicatat dalam stock_movements sebagai restock dan berada di transaksi SQL yang sama dengan penjualan.
- Game publik tidak memotong stok dan tidak membutuhkan auto-restock.

PERINGATAN: isi ulang ini adalah stok virtual/simulasi dan bukan bukti datangnya barang fisik. Hanya aktifkan saat memang sesuai kebutuhan operasional.

## File utama
- db/003_public_money_restock.sql — migrasi additive + checkout atomik, diuji di branch Neon sebelum produksi.
- worker/guest.js — identitas cookie pengunjung.
- worker/public.js — katalog & konfigurasi uang aman untuk publik.
- worker/game.js — pembatasan hak akses ke sesi pengunjung.
- worker/index.js — endpoint administrasi money/restock dan upload Cloudinary.
- src/PublicHomePage.jsx — halaman utama umum.
- src/MoneyAssetsPanel.jsx — upload uang per pecahan.
- src/AutoStockPanel.jsx — pengaturan restock.
- src/simulation/MoneyTray.jsx — gambar uang unggahan admin dengan fallback.
- src/simulation/VisualCustomerPage.jsx — pengambilan foto uang publik.
- src/public-guest-money.test.mjs — uji hak akses dan validasi.

## Cek rilis
1. Jalankan npm test, npm run build, npm run build:cloud.
2. Deploy commit terakhir melalui Cloudflare Git Integration; konfigurasi build: npm run build:cloud dan deploy: npx wrangler deploy.
3. Buka halaman / dari browser tanpa login: langsung melihat beranda dan tombol game.
4. Coba /simulasi: buat sesi, jawab, refresh, lanjutkan.
5. Buka /admin: login harus tetap diperlukan.
6. Upload gambar Rp500 di admin: tampil di /simulasi tanpa login.
7. Jangan uji transaksi penjualan nyata di produksi hanya untuk membuktikan restock; gunakan branch pengujian.
