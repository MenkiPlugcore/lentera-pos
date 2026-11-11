# LENTERA POS — Halaman Tambah dan Edit Produk Terpisah (v1.11)

## Alamat
- `/admin` : dashboard dan daftar produk, tanpa form tambah panjang.
- `/admin/produk/tambah` : halaman tersendiri untuk mendaftarkan produk baru.
- `/admin/produk/edit/<uuid>` : halaman edit untuk produk tertentu, menggunakan form yang sama.
- Semua URL admin baru melewati `CloudGate` dan meminta login sebagaimana `/admin`. Deep link didukung mode SPA Cloudflare.

## Alur
1. Buka `/admin` dan cari tombol `+ Tambah Produk` di bagian Daftar Produk, atau gunakan tautan Tambah Produk di navigasi admin.
2. Halaman tambah baru menampilkan formulir dalam satu kolom lebar, tanpa tabel inventaris di samping.
3. Isi nama, kategori, harga beli/jual, stok, batas minimum, barcode opsional, gambar dan deskripsi.
4. Klik `Simpan Produk`. API yang sama membuat produk dan SKU otomatis. Halaman tetap berada di formulir sehingga dapat menambahkan produk berikutnya; pesan sukses ditampilkan.
5. Untuk memperbaiki produk yang sudah ada, klik `Edit` pada daftar produk. Form terpisah memuat data berdasarkan ID produk.
6. Klik `Simpan Perubahan`; setelah berhasil kembali ke daftar produk dengan pesan sukses.
7. `Kembali ke Daftar` dan `Batal` tersedia pada form.

## Kompatibilitas dan keamanan
- API backend `/api/products` POST/PATCH, kategori dan Cloudinary tetap sama, tidak diganti.
- Arsip produk, barcode label, stok dan transaksi lama tidak diubah.
- Kasir admin, Kasir Biasa dan Simulasi Pelanggan tidak ikut dimodifikasi.
- Mode lokal yang memakai ProductManager tanpa CloudGate mempertahankan editor pada layar admin.
- Form edit tidak ditampilkan sebelum data produk selesai dimuat; ID yang tidak ada menampilkan pemberitahuan dan tombol kembali.

## Pengujian
- `npm test` termasuk `src/admin-product-pages.test.mjs`.
- `npm run build` dan `npm run build:cloud`.
- Uji browser pada desktop/HP: login sebagai admin, klik Tambah Produk, simpan, kembali daftar, lalu edit produk.
- Pastikan tautan langsung `/admin/produk/tambah` tetap memerlukan login.
- Foto Cloudinary dan kategori baru tetap tersimpan seperti sebelum perubahan.

Catatan: tes CI memeriksa kode dan build; data Neon tidak dimodifikasi dalam proses implementasi ini.
