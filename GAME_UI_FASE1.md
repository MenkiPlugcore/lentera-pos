# LENTERA POS — Fase 1 Simulasi Pelanggan Game UI

## Implementasi
Halaman /simulasi memakai scene arcade 2.5D dari sudut pandang kasir.
Illustrasi SVG lokal menampilkan rak produk, jendela, pelanggan, meja, layar kasir, dan scanner.
HUD: level, skor, XP, nama pemain, progres pelanggan 1–5, dan tombol Keluar.
Dialog pelanggan, pesanan, total belanja, dan uang diterima tampil di atas scene.
Laci uang interaktif / pilihan cepat tetap di bawah scene dan menggunakan gambar pecahan Cloudinary dari admin.
Backend game Neon, sesi pengunjung, skor, dan XP tidak diubah. Tidak ada perubahan stok atau transaksi nyata.

## Berkas
- src/simulation/StoreScene.jsx — background toko dan karakter SVG ekspresif.
- src/simulation/VisualCustomerPage.jsx — game HUD, dialog, panel order, alur game dan money tray.
- src/simulation/arcade.css — desain game 2.5D dan responsif desktop/tablet/HP.
- public/sw.js — cache versi v5 agar update CSS diambil ulang.

## Responsif dan pembelajaran
Desktop: scene lebar dengan overlay HUD, dialog dan order. Panel interaksi uang berada di bawah.
Tablet: HUD dan dialog menjadi lebih ringkas.
HP portrait: crop scene fokus pelanggan, panel order di bawah scene, kontrol dan uang ditumpuk vertikal.
Tersedia petunjuk, tanpa batas waktu, tiga kesempatan menjawab, umpan balik positif, dan pengurangan animasi sesuai preferensi perangkat.
Tombol HTML dapat diakses dengan sentuhan maupun keyboard; scene SVG tidak interaktif.

## Batasan fase 1
Ini ilustrasi SVG 2.5D, bukan game 3D penuh atau salinan persis gambar referensi.
Scanner dan monitor dalam scene masih dekoratif. Animasi pelanggan berjalan dan suara dapat dibuat pada fase berikutnya.

## Verifikasi setelah deploy
1. npm test; npm run build; npm run build:cloud.
2. Deploy commit GitHub terbaru ke Cloudflare Worker lentera-pos.
3. Buka https://pos.cadera.site/simulasi dan mulai sesi.
4. Uji 5 pelanggan, jawaban salah/benar, XP, lalu lanjut.
5. Uji pada layar 320, 360, 390, 768, 1024 dan 1440px.
6. Pastikan gambar uang admin tampil, tombol kembalian aktif dan tidak ada scroll horizontal.
7. Bila masih tampilan lama, coba hard refresh untuk memperbarui service worker v5.
