# LENTERA POS — Simulasi Kasir Satu Layar (UX v1.1)

## Masalah yang diperbaiki
Sebelumnya pelanggan dan informasi pesanan tampil di scene paling atas, sedangkan laci uang interaktif berada jauh di bawah. Siswa harus scroll bolak-balik untuk melihat nominal lalu memilih pecahan.

## Tata letak baru
- Desktop (lebar > 960px): scene toko di sebelah kiri, panel laci uang di sebelah kanan. Panel uang memiliki scroll internal jika layar pendek, sehingga tidak perlu meninggalkan scene untuk memilih pecahan.
- Tablet/HP (lebar <= 960px): scene tampil dalam satu viewport; tombol "Buka Laci Uang" terlihat langsung di bagian bawah scene. Ketuk untuk membuka bottom drawer yang bisa ditutup dengan tombol, latar belakang, atau tombol Escape.
- Dalam laci, total uang terpilih dan tombol "Serahkan Uang" diprioritaskan di bagian atas. Pecahan lebih tinggi daripada uang pelanggan tidak perlu ditampilkan.
- Bila sesi terakhir selesai, drawer ditutup agar layar hasil terlihat.
- Panduan menghitung tetap tersedia tetapi menjadi konten sekunder.
- Tetap mendukung uang kertas/koin custom Cloudinary, tiga percobaan, game Neon, skor dan XP, tanpa mengubah stok atau transaksi asli.

## Berkas berubah
- src/simulation/VisualCustomerPage.jsx — split-screen serta state buka/tutup drawer.
- src/simulation/MoneyTray.jsx — mode compact, ringkasan dan aksi serahkan di atas laci, menyembunyikan pecahan yang melebihi uang dibayar.
- src/simulation/arcade.css — responsive grid desktop, drawer HP, tombol laci, dan ukuran pecahan ringkas.
- public/sw.js — versi cache baru supaya frontend diperbarui.

## Verifikasi
1. GitHub Actions: npm test, npm run build, npm run build:cloud.
2. Deploy commit terbaru melalui Cloudflare.
3. Desktop: cek lebar 1024, 1280, 1440 dan tinggi viewport sekitar 700–900.
4. HP: cek 320, 360, 390, 430, 768 dan 900 piksel.
5. Mainkan sesi: buka drawer, pilih pecahan, batalkan, serahkan jawaban, jawab salah/benar, lanjut, sampai selesai.
6. Cek tombol "Serahkan Uang" tetap terlihat saat scroll di dalam drawer dan koin custom tetap tampil.
7. Data stok dan transaksi asli tetap tidak terpengaruh.

Catatan: Pengujian GitHub Actions memeriksa build dan logika, bukan pengujian visual pada HP fisik. Perlu cek screenshot setelah deploy.
