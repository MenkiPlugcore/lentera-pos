# LENTERA POS — Pemisahan Menu Produk dan Gambar Uang (v1.11.1)

## Permintaan
Produk tidak boleh dicampur dengan Gambar Uang di halaman admin yang sama. Perubahan sebelumnya hanya memisahkan form tambah produk, tetapi daftar produk dan panel gambar uang masih satu dashboard.

## Struktur admin
- `/admin`: dashboard ringkasan database, status Cloudinary dan peralatan admin lain. Hanya menampilkan tautan **Produk & Stok** dan **Gambar Uang**, tanpa daftar produk maupun upload gambar uang di dalamnya.
- `/admin/produk`: khusus inventaris (daftar produk, pencarian, stok, status, barcode, aksi edit/arsip, dan tombol tambah).
- `/admin/produk/tambah`: form tambah produk terpisah.
- `/admin/produk/edit/<uuid>`: form edit produk terpisah.
- `/admin/gambar-uang`: khusus unggah/ganti/hapus gambar pecahan uang dan koin Cloudinary, menggunakan MoneyAssetsPanel yang sama.

## Alur dan keamanan
- Semua halaman baru tetap berada di balik CloudGate, tidak tersedia untuk tamu.
- Dashboard CloudAdminPanel tidak lagi mengimpor atau menampilkan MoneyAssetsPanel.
- Produk, kategori, dan gambar uang tetap memakai API semula, tidak ada migrasi tabel atau modifikasi data Neon.
- Navigasi admin memuat tautan Produk, Gambar Uang, Tambah Produk, Dashboard, Kasir dan menu lain.
- Setelah mengedit produk, kembali ke `/admin/produk` dengan pesan sukses; tombol batal/kembali pada form produk juga menuju daftar produk.
- Mode lokal tidak berubah. Pada mode cloud, ProductManager tidak dirender di dashboard atau halaman gambar uang.

## Verifikasi
1. npm test, npm run build, npm run build:cloud.
2. Buka `/admin`: panel uang dan daftar produk tidak tampil di bawah dashboard.
3. Buka `/admin/produk`: daftar produk muncul, tanpa gambar pecahan uang.
4. Buka `/admin/gambar-uang`: hanya daftar pecahan uang/koin dan upload, tanpa inventaris.
5. Tambah produk, edit produk, upload foto uang, dan pastikan masing-masing API bekerja seperti sebelumnya.
6. Buka URL menu tanpa login, pastikan tetap muncul halaman login.

Catatan: pengujian CI tidak menggantikan verifikasi visual dan deployment Cloudflare live.
