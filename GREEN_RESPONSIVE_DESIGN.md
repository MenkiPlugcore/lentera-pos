# LENTERA POS — Green & White Responsive Redesign

## Cakupan
Desain publik baru berfokus pada mobile-first, dengan warna hijau dan putih, tanpa mengubah transaksi, database Neon, maupun logika game.

Komponen:
- src/PublicHomePage.jsx: beranda baru dengan ilustrasi transaksi, CTA simulasi, dua pilihan modul, tiga langkah belajar, katalog produk, loading, retry, empty state, footer.
- src/landing.css: design tokens, header responsif, grid modern, pembatasan lebar konten, aksesibilitas keyboard, breakpoints.
- src/main.jsx: navbar publik putih dengan ikon daun dan menu mobile berfungsi, halaman login admin, navigasi admin responsif.
- src/styles.css: aksen global hijau menggantikan cyan, latar lembut hijau-putih, tombol primer/sekunder, focus states.
- src/simulation/simulation.css: layar simulasi uang/kasir menggunakan panel putih + hijau dengan keterbacaan lebih baik.
- index.html: meta theme-color hijau dan deskripsi situs.
- public/sw.js: bump offline cache ke v4 agar perubahan CSS/halaman lama tidak tersimpan lama.

## Prinsip visual
- Green primary #18794e, dark #0d5e3b, mint #edfaf1, white #fff, teks #183d30.
- Konten dibatasi ~1160px dengan margin aman, card dengan shadow sangat ringan.
- Tombol CTA berukuran sentuh >= 44px, hero main action 52px.
- Label, harga, dan status tidak hanya mengandalkan warna.
- Tidak memakai gambar/ilustrasi eksternal tambahan untuk hero; simulasi transaksi visual adalah preview statis, bukan checkout asli.

## Responsif
- Desktop >=1024px: hero dua kolom, katalog empat kolom, navigasi horizontal.
- Tablet 768–1023px: hero dua kolom yang lebih ringkas, kartu menyusut mengikuti lebar viewport.
- HP 561–767px: hero satu kolom, menu hamburger, katalog dua kolom.
- HP <=560px: tombol CTA memenuhi lebar, modul belajar bertumpuk satu kolom, preview kartu dikecilkan.
- HP <=350px: katalog satu kolom dan beberapa komponen transaksi ditata vertikal.
- Navbar publik memakai tombol Menu yang dapat dibuka/ditutup, dengan aria-expanded dan aria-controls.
- Navigasi admin di HP dapat di-scroll horizontal bila item terlalu banyak, tanpa memaksa halaman melebar.
- Mode prefer-reduced-motion menghilangkan efek transform hover yang tidak diperlukan.

## Cara memeriksa setelah deployment
1. Buka https://pos.cadera.site/ menggunakan HP atau DevTools responsive.
2. Cek viewport 320, 360, 390, 430, 768, 1024 dan 1440 piksel.
3. Pastikan tidak ada horizontal page overflow (kecuali scroll nav admin yang disengaja).
4. Klik Menu pada HP: tautan Beranda, Simulasi Pelanggan, Kasir Pintar, Masuk Admin tampil rapi.
5. Cek tombol CTA dan tautan kartu masuk halaman yang tepat.
6. Cek loading produk, foto Cloudinary dan fallback produk tanpa foto.
7. Cek login admin dan transisi kembali ke beranda; panel admin & kasir tetap bekerja.
8. Cek /simulasi dengan gambar uang admin: susun pecahan dan jawab benar/salah.
9. Uji keyboard Tab/Enter dan fokus terlihat jelas.
10. Cache versi v4 aktif setelah deploy; bila masih tampilan lama, hard refresh atau tunggu SW baru mengambil alih.

## Verifikasi otomatis
- npm test
- npm run build
- npm run build:cloud
- node --check worker/index.js

Build dan tes otomatis tidak membuktikan tampilan pada perangkat fisik. Verifikasi visual akhir tetap memerlukan pemeriksaan viewport setelah deployment Cloudflare.
