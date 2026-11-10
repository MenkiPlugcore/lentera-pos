# LENTERA POS — Local Profiles & Level Map v1.7

Simulasi pelanggan di /simulasi menggunakan **profil lokal browser** dan **40 level berurutan**, tanpa membuat akun, sesi, jawaban, atau skor di Neon.

## Aturan permainan
- Buat profil dengan nama panggilan (2–32 karakter). Profil disimpan di localStorage perangkat dan browser yang digunakan.
- Tidak ada email, password, atau sinkronisasi lintas perangkat. Hingga 30 profil per browser.
- Pilih salah satu dari 40 level pada peta. Level 1 terbuka saat profil dibuat. Level berikutnya terkunci hingga lulus level sebelumnya.
- Tiap level terdiri dari 5 pelanggan tanpa timer. Lulus bila minimal 3 dari 5 pelanggan dijawab benar.
- Bintang: 3 benar=1 bintang, 4 benar=2 bintang, 5 benar=3 bintang. Skor 20 poin per jawaban benar di percobaan pertama, 15 kedua, 10 ketiga.
- Level yang sudah lulus bisa diulang untuk memperbaiki bintang dan skor terbaik. Gagal tidak membuka level berikutnya.
- Setiap pelanggan tetap memiliki hingga 3 percobaan. Jika 3 kali salah, soal selesai dan dapat melanjutkan ke pelanggan berikutnya.
- Level 1–8: 2 jenis barang; 9–16: 3 jenis; 17–24: 3 jenis dengan jumlah bisa 1–2; 25–32: 4 jenis dengan jumlah 1–2; 33–40: 5 jenis dengan jumlah bisa 1–3.
- Katalog produk dan gambar uang diambil secara GET dari endpoint publik bila tersedia; fallback katalog dan ilustrasi uang lokal tetap dapat digunakan saat offline. Hanya data produk umum, bukan data akun siswa.

## Privasi dan penyimpanan
- Kunci localStorage: lentera-pos-simulasi-local-v1 dan lentera-pos-simulasi-selected-v1.
- Menyimpan profil, level yang sudah lulus, bintang/skor terbaik, serta level/soal yang sedang dikerjakan.
- Keluar ke peta level mempertahankan soal aktif. Saat halaman dimuat lagi, level aktif dapat dilanjutkan.
- Jika data situs/browser dibersihkan, profil lokal dan progres hilang; belum ada sinkronisasi atau backup.
- Profil dapat dihapus dari peta level setelah konfirmasi, tanpa menyentuh sesi dan data Neon yang lama.
- /game (Kasir Pintar) dan API game Neon sebelumnya tetap tersedia dan tidak dimigrasi secara otomatis.

## Komponen
- src/simulation/localLevels.js: mesin progres, penilaian dan penyimpanan lokal.
- src/simulation/LevelSelect.jsx, levelSelect.css: pemilih profil dan 40 level, peta level, hasil, serta resume.
- src/simulation/VisualCustomerPage.jsx: integrasi state lokal, keranjang visual, kalkulator slide, dan laci uang.
- src/local-levels.test.mjs: pengujian 40 level, progres, bintang, percobaan, persistence, dan isolasi backend.
- src/minimal-game-ui.test.mjs: penyesuaian tes lama untuk tampilan pemilihan level.

## Keamanan data
Fitur ini tidak menggunakan POST ke /api/game maupun endpoint transaksi; hanya membaca katalog/foto uang publik. Tidak ada perubahan schema Neon, stok, omzet, atau pembayaran sungguhan. Catatan level yang disimpan lokal dapat diubah oleh pengguna perangkat, sehingga ini adalah penilaian formatif, bukan sertifikasi anti-manipulasi.

## Verifikasi
1. npm test, npm run build, npm run build:cloud.
2. Mulai profil baru, pastikan hanya level 1 yang terbuka.
3. Coba lima pelanggan; tiga benar membuka level 2 dan mencatat satu bintang.
4. Gagal dengan dua benar; level 2 tetap terkunci.
5. Keluar dari level berjalan dan buka lagi; progres dan soal sama.
6. Refresh browser untuk memastikan localStorage masih ada.
7. Buat profil kedua dan pastikan progres tidak tercampur.
8. Cek keranjang, kalkulator, laci uang di desktop maupun HP.
9. Cek tabel produk, stok, dan transaksi Neon tetap sama.

Catatan: build CI tidak menggantikan pemeriksaan deploy Cloudflare dan tampilan perangkat nyata.
