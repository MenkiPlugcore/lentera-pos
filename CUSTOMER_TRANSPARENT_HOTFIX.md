# Hotfix LENTERA POS — Pelanggan tanpa kotak putih (v1.3.1)

## Masalah
Versi v1.3 menggunakan karakter PNG berlatar putih dan CSS mix-blend-mode pada <img>. Elemen karakter berada di stacking context dengan transformasi animasi; blending tidak menyatu sempurna sehingga background putih tampil sebagai persegi panjang di depan toko.

## Perbaikan
1. Ubah ketiga aset menjadi **turunan Cloudinary PNG transparan** dengan efek `e_make_transparent:15/f_png` (efek transparansi pada latar seragam, tidak memakai generative AI). Gambar sumber tetap utuh.
2. Tampilkan turunan transparan, bukan PNG putih asli. CSS karakter menggunakan normal blending; tidak lagi mengandalkan multiply.
3. Tambahkan layer foreground dari gambar toko yang sama, dengan mask dari 78% ke 90% tinggi scene. Ini memberi ilusi meja kasir/keyboard berada di depan karakter, bukan ditembus oleh bajunya.
4. Perkecil dan geser karakter serta dialog supaya wajah pelanggan tidak tertutup bubble atau HUD.
5. Responsif untuk desktop/tablet/HP dan mode reduced-motion tetap berlaku.
6. Cache service worker diperbarui ke v9.

## File
- src/simulation/customerProfiles.js
- src/simulation/StoreScene.jsx
- src/simulation/arcade.css
- src/simulation/scene-assets.test.mjs
- public/sw.js

## Yang tidak berubah
Neon, game sessions, poin, XP, uang interaktif, Cloudinary nominal, admin, dan checkout.

## Verifikasi
1. GitHub Actions lulus npm test, npm run build dan npm run build:cloud.
2. Deploy commit ke Cloudflare, buka /simulasi di mode samaran.
3. Coba ketiga karakter dan pastikan tidak ada kotak putih.
4. Pastikan wajah tidak tertutup HUD, tangan memegang uang tetap terlihat, dan keyboard/meja kasir tampak di depan bagian bawah karakter.
5. Cek mobile portrait dan desktop split screen. Bila terlihat UI lama, hard-refresh supaya cache v9 diperbarui.

Catatan: karena gambar awal tidak punya alpha, hasil otomatis e_make_transparent tetap harus dicek pada tampilan live. Jika tepi rambut atau baju kurang rapi, alternatif terbaik adalah ekspor karakter dari editor grafis ke PNG transparan sebelum upload.
