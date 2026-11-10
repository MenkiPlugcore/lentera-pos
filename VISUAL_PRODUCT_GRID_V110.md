# LENTERA POS v1.10 — Katalog Visual Besar dan Keranjang Geser

## Referensi
Diadaptasi dari berkas HTML rancangan yang dikirim pengguna pada 10 November 2026. Tujuannya menonjolkan gambar produk seperti kartu katalog besar, bukan thumbnail 53px. HTML asli adalah mockup statis dengan Tailwind CDN dan produk dummy; implementasi produksi menggunakan komponen React, katalog Cloudinary dari Neon (read-only), dan mesin kasir latihan yang sudah ada.

## Perubahan UI
- Produk sekarang berupa kartu potret besar: foto di atas, nama di bawah, harga di bawahnya, ikon plus kecil di pojok.
- Seluruh kartu adalah satu button yang dapat diklik atau diaktifkan dengan keyboard; tidak ada tombol tambah bersarang.
- Gambar menggunakan area 118–167px dengan object-fit: contain agar produk tidak terpotong.
- Katalog menampilkan 2 kolom pada ponsel, 3 pada desktop yang cukup lebar, dan sampai 4 pada layar besar.
- Satu kolom input menangani pencarian produk sekaligus barcode/SKU. Scan barcode lalu Enter untuk menambahkan item; mengetik nama langsung memfilter kartu.
- Keranjang tetap di sidebar kanan pada desktop.
- Di HP dan tablet <=900px, keranjang tersembunyi di drawer bawah yang dibuka melalui tombol keranjang mengambang; tombol tutup, area gelap, dan Escape juga bisa menutup.
- Modal berat tidak disalin dari mockup; struk sukses yang ada tetap tersedia di panel kasir.
- CSS baru menggunakan class pc-gallery-* terpisah dari CSS kartu horizontal lama, sehingga aturan thumbnail lama tidak membatasi ukuran gambar.
- Cache service worker dinaikkan ke v21.

## Tidak berubah
- Mode publik `/kasir-umum` tanpa login.
- Katalog produk dan gambar Cloudinary diambil dari endpoint publik read-only.
- Kuantitas keranjang, barang manual, penerimaan uang tunai, kembalian, struk latihan, dan stok virtual isi ulang otomatis masih bekerja.
- Tidak menyentuh stok maupun transaksi admin `/kasir` di Neon.
- Data produk dummy dalam HTML contoh tidak disalin menjadi data produksi.

## Pengecekan
1. `npm test`, `npm run build`, `npm run build:cloud`.
2. Deploy commit baru; pastikan file JS/CSS baru terbit (bukan service worker lama).
3. Buka `/kasir-umum` di desktop: gambar produk dominan, kartu dapat diklik, keranjang di kanan.
4. Di HP: 2 kolom kartu, tombol keranjang, drawer, tutup lewat tombol/backdrop/Escape.
5. Cari nama barang, scan barcode dengan Enter, ubah jumlah, bayar uang cukup, dan periksa struk.
6. Verifikasi stok dan transaksi riil tidak berubah.
7. Cek gambar produk yang sangat horizontal/vertikal; jika ada aset dengan whitespace besar di dalam file, perlu crop khusus aset bukan menambah thumbnail lagi.

Catatan: tes otomatis memverifikasi integrasi kode, bukan hasil rendering pada perangkat nyata atau status deployment Cloudflare.
