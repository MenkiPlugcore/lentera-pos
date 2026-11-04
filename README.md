# LENTERA POS — Mode Lokal

Aplikasi kasir dan praktik TKJ berbasis React + Vite. **Tidak memerlukan login, Neon/PostgreSQL, Cloudflare Functions, API, atau server backend.** Produk, kategori, stok, transaksi, laporan, dan gambar produk tersimpan pada localStorage browser di perangkat yang sedang digunakan.

## Menjalankan di komputer sendiri

Pastikan Node.js minimal v20.19 terpasang. Saat pertama instalasi, npm mungkin memerlukan internet untuk mengunduh dependency.

    npm install
    npm run dev

Buka alamat lokal yang ditampilkan Vite (umumnya http://localhost:5173). Langsung masuk ke kasir atau buka /admin untuk mengelola produk. Tidak ada setup akun ataupun password.

Untuk menghasilkan situs statis:

    npm run build
    npm run preview

Folder dist/ berisi frontend statis yang bisa disajikan dengan web server lokal atau layanan hosting statis. Tidak ada API server pada build ini. **Jangan buka dist/index.html via file://**, karena aplikasi Vite memerlukan HTTP server.

## Fitur

- Manajemen produk, kategori, stok, dan SKU otomatis LP000001 dst.
- Kode barcode eksternal, cetak label, dan pemindai barcode jika perangkat mendukung.
- Unggah gambar dari perangkat; gambar dikompresi dan disimpan lokal (bukan URL/server gambar).
- Kasir tunai, validasi stok, perhitungan kembalian, dan struk.
- Riwayat transaksi, omzet, laba estimasi, produk terlaris, dan laporan berdasarkan tanggal WIB.
- Arsip produk; hapus permanen hanya untuk produk yang **belum pernah terjual**.
- Ekspor dan impor seluruh data lokal ke berkas JSON.

## Penting: batasan mode lokal

- Setiap kombinasi **browser + profil + alamat situs (origin)** memiliki data sendiri. Data di Chrome tidak otomatis muncul di Firefox, perangkat lain, atau alamat domain berbeda.
- Data tidak tersinkronisasi antarkomputer. Untuk memindahkan data, gunakan tombol **Ekspor Cadangan JSON** di /admin, salin filenya ke perangkat lain, lalu **Impor Cadangan**. Impor **mengganti** data yang sudah ada pada browser tujuan.
- Hapus data situs, reset browser, mode privat, atau kerusakan perangkat dapat menghilangkan data. **Cadangkan file JSON secara berkala dan simpan di luar perangkat**.
- Kapasitas localStorage terbatas (bergantung browser); sebaiknya gunakan gambar kecil dan hindari menyimpan ribuan transaksi atau gambar besar. Ketika penyimpanan penuh, perubahan ditolak tanpa menyimpan stok setengah jadi.
- Hindari membuka POS di banyak tab sekaligus. Browser dengan Web Locks akan mengunci operasi tulis antartab, tetapi browser lain mungkin tidak menjamin konsistensi pada transaksi yang bersamaan.
- Jika situs di-hosting publik, semua pengunjung dapat menggunakan aplikasi tanpa login, **namun hanya mengakses data lokal browser masing-masing**, bukan data pengunjung lain.
- Kamera untuk scan barcode mungkin memerlukan HTTPS atau localhost, dan izin kamera browser.
- Paket aplikasi dapat dijalankan di localhost tanpa internet **setelah dependencies terpasang**; gambar produk baru tidak bergantung pada layanan eksternal.

## Migrasi dari sistem Neon lama

Data di database Neon **tidak otomatis dipindahkan** ke mode lokal. Jika sistem lama sudah berisi data penting, ekspor data dari sistem lama sebelum berhenti menggunakannya. Format backup JSON mode lokal bukan ekspor SQL; migrasi dari Neon harus dikonversi terlebih dahulu.

## Pengujian

    npm test
    npm run build

File server/SQL lama dihapus karena mode lokal tidak memerlukan backend. Jangan menghapus database Neon lama tanpa membuat backup jika masih memiliki data.
