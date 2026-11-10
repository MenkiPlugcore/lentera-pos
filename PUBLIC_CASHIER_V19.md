# LENTERA POS v1.9 — Kasir Biasa untuk Umum

## Perubahan utama
Modul lama **Kasir Pintar** (/game), yang berisi soal pilihan ganda berbasis sesi Neon, diganti dengan **Kasir Biasa** untuk latihan publik di `/kasir-umum`. URL lama `/game` tetap berfungsi sebagai alias untuk menghindari tautan rusak. Kasir admin `/kasir` tetap memerlukan login dan tidak mengalami perubahan.

## Alur kasir biasa
1. Semua pengunjung dapat membuka `/kasir-umum` tanpa akun.
2. Pilih produk dari katalog aktif melalui endpoint GET publik atau ketik/scan barcode dan SKU menggunakan scanner keyboard.
3. Tambah barang ke keranjang, ubah jumlah, hapus barang atau kosongkan keranjang.
4. Opsional: tambah barang manual dengan nama dan harga untuk latihan bebas. Barang manual hanya berlaku dalam keranjang dan tidak disimpan ke database.
5. Masukkan uang pelanggan atau pilih nominal cepat/uang pas.
6. Setelah jumlah uang cukup, klik Selesaikan Transaksi Latihan. Aplikasi menampilkan struk simulasi, kembalian, dan informasi isi ulang stok otomatis.
7. Keranjang kosong sesudah transaksi agar dapat digunakan untuk latihan pembeli berikutnya. Struk terakhir dapat disalin.

## Stok otomatis
- Stok setiap produk dalam mode latihan selalu **100 unit virtual**.
- Saat transaksi selesai, unit yang dibeli otomatis diisi kembali ke nilai awal 100 unit; pelanggan berikutnya tetap dapat membeli produk yang sama.
- Jumlah yang diisi ulang ditampilkan dalam struk/notifikasi, tetapi tidak menulis ke tabel `products`, `stock_movements`, `transactions`, maupun `transaction_items` di Neon.
- Stok nyata kasir admin, omzet nyata, pembayaran Tripay/QRIS, dan laporan transaksi nyata tidak disentuh.

## Privasi dan mode penggunaan
- Tanpa login, tanpa pendaftaran, tanpa sesi game, tanpa XP.
- Keranjang, struk, dan jumlah transaksi latihan ada di memori tab browser. Refresh akan menghapus sesi kasir publik, bukan data kasir admin.
- Katalog produk diambil read-only dari `/api/public/catalog` dan kini menyertakan SKU/barcode publik untuk pencarian scanner.
- Jika koneksi/katalog tidak tersedia, tersedia katalog latihan bawaan lokal.
- Hanya latihan; tidak menerima uang sungguhan, tidak memproses pembayaran dan tidak menyimpan data pembeli.

## Berkas
- `src/PublicCashierPage.jsx` dan `src/publicCashier.css`: kasir publik.
- `src/publicCashier.js`: fungsi keranjang, kembalian, struk, dan isi ulang stok virtual.
- `src/main.jsx`: rute publik baru, legacy `/game`, menu publik.
- `src/PublicHomePage.jsx`: label/tautan Kasir Biasa.
- `worker/public.js`: tambahan SKU/barcode dalam endpoint katalog GET.
- `src/multi-item-shopping.test.mjs` dan `src/public-cashier.test.mjs`: pengujian alur baru dan isolasi database.
- `src/GamePage.jsx`: dihapus dari runtime dan repository.
- `public/sw.js`: cache version v17 dengan `/kasir-umum`.

## Checklist
1. Jalankan `npm test`, `npm run build`, `npm run build:cloud`.
2. Deploy Cloudflare terbaru; uji `/kasir-umum` tanpa login.
3. Pilih dua produk, tambah jumlah, masukkan uang, lalu cek total dan kembalian.
4. Selesaikan transaksi; cek struk dan informasi restok. Lakukan transaksi kedua dengan barang sama (stok tetap tersedia).
5. Uji barcode/sku dari produk katalog, fallback offline dan barang manual.
6. Buka `/kasir` sebagai tamu: tetap diminta login admin.
7. Periksa stok/riwayat transaksi di admin: tidak berubah akibat latihan publik.

Catatan: build CI menguji kode, bukan hasil deployment dan tampilan visual live di HP.
