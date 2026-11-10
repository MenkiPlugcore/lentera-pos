# LENTERA POS v1.9.1 — Kasir Biasa Minimal UI

Tujuan: hilangkan informasi yang berulang di `/kasir-umum` agar proses latihan lebih jelas bagi siswa.

## Tampilan baru
- Header hanya menampilkan Kasir Biasa serta penanda Mode latihan.
- Notifikasi singkat tetap menegaskan bahwa stok otomatis dan ini bukan transaksi asli.
- Hilangkan tiga kartu statistik umum, label langkah, deskripsi panjang, stok yang diulang pada setiap produk, dan petunjuk teknis setelah checkout.
- Tampilan katalog menampilkan nama barang, harga, gambar dan tombol tambah; barcode/SKU serta pencarian tetap tersedia.
- Barang manual tetap opsional melalui disclosure, dengan label tetap tersedia untuk screen reader.
- Panel kasir menampilkan keranjang, jumlah unit, total belanja, uang diterima, kembalian, dan tombol Selesaikan.
- Struk latihan masih menampilkan rincian transaksi dan bisa disalin, tanpa paragraf isi ulang stok yang berulang.
- Kartu, jarak, dan label diperkecil untuk layar desktop dan HP; target sentuhan minimal 40–44px.

## Tidak berubah
- Katalog produk publik tetap read-only dari Neon; latihan bisa memakai katalog bawaan bila offline.
- Stok virtual selalu terisi kembali setelah transaksi; tidak mengubah database stok, omzet, atau transaksi admin.
- Kasir sungguhan di `/kasir` tetap membutuhkan login.
- Scanner barcode, barang manual, kalkulasi kembalian, dan struk tetap berfungsi.

## Verifikasi
- Jalankan `npm test`, `npm run build`, `npm run build:cloud`.
- Tes alur memilih barang → keranjang → uang diterima → kembalian → struk.
- Uji HP dan desktop. Periksa notifikasi apabila nominal kurang dan informasi bahwa aplikasi hanya simulasi.
