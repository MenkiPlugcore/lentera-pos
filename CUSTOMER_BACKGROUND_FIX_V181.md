# LENTERA POS v1.8.1 — Fix karakter fantasi berlubang

## Penyebab
Empat ilustrasi fantasi memiliki background putih, tetapi hantu berwarna putih/biru muda dan malaikat memiliki sayap/pakaian putih. Transformasi Cloudinary `e_make_transparent:15` menghapus piksel terang berdasarkan warna, tidak mempertimbangkan bentuk objek. Akibatnya, bagian badan, sayap, serta highlight ikut hilang dan memperlihatkan latar toko.

## Solusi
- Untuk Milo (kucing), Boo (hantu), Rubi (iblis kecil), dan Aura (malaikat), memakai transformasi berbasis pemisahan subjek `e_background_removal/f_png` yang mempertahankan bagian putih dari karakter.
- Keempat gambar hasil transformasi telah dibuat dan tercantum sebagai derived asset di Cloudinary, masing-masing memiliki ukuran file terverifikasi.
- Tiga karakter manusia lama tidak diubah; tidak mengalami masalah serupa.
- Tidak mengubah scene depth, CSS pelapisan meja, soal, progres 40 level, atau transaksi.
- Cache service worker dari v15 ke v16 untuk mendorong browser mengambil kode dengan URL gambar baru.

## Verifikasi
1. Jalankan `npm test`, `npm run build`, `npm run build:cloud`.
2. Pastikan deploy Cloudflare menggunakan commit perbaikan terbaru.
3. Gunakan hard refresh bila tampilan lama tersimpan di service worker.
4. Saat Boo muncul, tubuh putih-biru tetap utuh tanpa lubang hitam atau kotak transparansi di bagian tengah.
5. Saat Aura muncul, sayap putih tetap utuh dan tidak bergerigi/terhapus.
6. Periksa Milo dan Rubi juga tetap rapi; posisi karakter berada di belakang meja kasir.
7. Periksa melalui desktop dan HP, termasuk profil pemain yang sedang melanjutkan level; hash ID karakter yang sama akan memakai aset baru.

Catatan: tes build tidak menilai hasil visual di website live secara otomatis; diperlukan satu verifikasi screenshot setelah deployment.
