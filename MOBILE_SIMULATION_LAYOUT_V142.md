# LENTERA POS v1.4.2 — Perbaikan mobile secara struktural

## Masalah
Pada screenshot HP 10 November 2026, HUD, judul yang tertanam dalam gambar, balon dialog, dan keranjang saling bertumpuk sehingga menutupi pelanggan. CSS v1.4.1 sempat mengatur flex untuk stage tetapi meninggalkan lapisan gambar dengan posisi absolut memenuhi panggung, sehingga perbaikan belum efektif.

## Perbaikan
- Pisahkan tata letak desktop dan HP. Desktop mempertahankan scene overlay lama; di bawah 961px seluruh elemen permainan mengalir vertikal.
- Urutan HP: HUD level/progres → ilustrasi toko dan pelanggan → dialog pelanggan → keranjang dan nominal → tombol Laci Uang/Kalkulator.
- Area gambar toko sendiri memakai ukuran adaptif dengan aspect-ratio 1.25:1, bukan mengambil seluruh tinggi stage.
- Gambar latar dan lapisan foreground dicropping secara bersama dengan scale 1.23, agar tulisan level bawaan di bagian atas ilustrasi sumber tidak bertabrakan dengan HUD asli.
- Layer karakter tetap berada di belakang meja, di dalam batas gambar toko, dengan posisi mobile tersendiri.
- Dialog dan keranjang tidak lagi position:absolute pada HP; keduanya menjadi kartu di bawah gambar. Ketika pelanggan berganti, layout tetap sama.
- Header, daftar barang, total, dan uang diterima memakai warna kontras dan jarak yang ringkas.
- Tombol aksi tetap dua kolom dan tidak menimpa keranjang. Laci uang modal dari bawah serta kalkulator geser tidak berubah.
- Aturan CSS lama v1.4.1 yang bertentangan dihapus. Aturan mobile terbaru dipisah ke `mobileScene.css` agar lebih mudah dirawat.
- Service worker v24 supaya browser memakai gaya baru setelah deployment.

## Validasi
1. `npm test`, `npm run build`, `npm run build:cloud`.
2. Screenshot HP Android lebar 360–430px: pastikan wajah pelanggan dan gambar toko tidak tertutup kartu atau tombol.
3. Pastikan HUD di luar gambar, sedangkan banner lama di gambar sumber telah terpotong.
4. Cek Level 1 sampai 40, dengan 2–5 produk per soal, pada ukuran layar 320,360,390,430,768,960, dan desktop 1024px+.
5. Keranjang ringkas tetap terbaca, buka/tutup Laci Uang, buka/tutup Kalkulator, serahkan uang dan lanjut level.
6. Refresh browser, pastikan localStorage profil dan level tidak berubah.

Catatan: status tes otomatis memeriksa struktur dan build, bukan screenshot nyata. Aset gambar tetap di Cloudinary.
