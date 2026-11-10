# LENTERA POS v1.10.1 — Perbaikan input pembayaran dan struk cetak/PDF

## Bug diperbaiki
Input uang diterima memakai type=text dan inputMode=numeric namun sebelumnya diberi pattern `[0-9]*`. Angka yang ditampilkan sudah berformat ribuan `50.000`, sehingga browser menganggap input tidak sesuai pola dan menghalangi form submit meskipun nominal cukup.

Perbaikan: hapus atribut pattern HTML yang bertentangan dengan tampilan berformat rupiah; nilai yang diketik atau ditempel selalu dinormalisasi menjadi digit mentah oleh `normalizeCashInput`, sementara `displayCashInput` menampilkan titik ribuan. Misal `Rp 50.000` -> `50000` -> tampilan `50.000`. HTML tetap memakai keyboard angka untuk HP.

## Struk siap cetak dan unduh
- Setelah transaksi latihan berhasil, tampil pratinjau struk: judul LENTERA POS, nomor, tanggal/jam, barang beserta jumlah dan harga satuan, total, uang diterima, serta kembalian.
- Tombol **Cetak struk** menggunakan `window.print()` dengan stylesheet khusus struk 80mm; elemen antarmuka kasir disembunyikan sewaktu cetak.
- Tombol **Unduh PDF** membangkitkan file .pdf langsung di browser, lebar struk 80mm dan tinggi mengikuti banyaknya barang. Tidak memakai CDN atau backend untuk PDF.
- Tombol **Salin** tetap ada dan menggunakan teks struk yang sudah tersedia.
- Struk diberi tanda **BUKAN TRANSAKSI ASLI** supaya tidak tertukar dengan dokumen penjualan nyata.
- PDF menggunakan font Courier standar agar tetap kecil dan siap cetak di printer thermal. Karakter non-ASCII tertentu disederhanakan dalam versi PDF; nama lengkap tetap ada pada pratinjau HTML.

## Pengamanan
- Semua proses checkout, pencetakan dan download menggunakan data transaksi simulasi di memori browser.
- Tidak ada penulisan stok/omzet/transaksi ke Neon, dan tidak memerlukan akses login.
- /kasir admin tidak diubah. Pengubahan form hanya terjadi di /kasir-umum.

## Verifikasi
- npm test, npm run build, npm run build:cloud
- Di Kasir Biasa, pilih Air Mineral 5x (= Rp25.000), isi `50.000`, tekan Selesaikan: tidak muncul pop-up 'Please match the requested format', kembalian Rp25.000.
- Periksa struk latihan termasuk jumlah, harga, tanggal, total, pembayaran dan kembalian.
- Cetak struk dari browser: hanya struk, bukan halaman kasir.
- Unduh PDF, buka berkas dan uji pratinjau serta cetak; file harus berupa PDF valid ukuran lebar 80mm.
- Uji HP/desktop serta jumlah barang banyak. Cache service worker v22.

Catatan: tes CI memeriksa PDF byte structure, angka dan build. Pencetakan nyata/printer thermal serta deploy Cloudflare tetap perlu uji di perangkat yang digunakan.
