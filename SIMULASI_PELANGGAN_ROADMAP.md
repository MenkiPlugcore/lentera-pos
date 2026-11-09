# Roadmap — LENTERA POS / Simulasi Pelanggan Visual

## Tujuan
Menyediakan simulasi kasir yang mudah dipahami siswa ABK melalui pelanggan bergambar, instruksi singkat, jawaban besar, dan umpan balik positif. Game memakai sesi, tantangan, nilai dan XP dari API game yang sudah ada di Neon. Tidak ada checkout, pengurangan stok, atau omzet sungguhan.

## Fase pengembangan

| Fase | Fitur | Status |
| --- | --- | --- |
| A: Visual pelanggan | Halaman /simulasi, ilustrasi pelanggan SVG, bubble percakapan, ekspresi, menu belanja, panel uang, tiga pilihan jawaban, progres, skor dan XP | Implementasi MVP |
| B: Variasi pembeli | Dialog per pelanggan, beberapa barang dalam satu pesanan, skenario uang pas, pelanggan terburu-buru (tanpa paksaan timer) | Rencana |
| C: Pendampingan ABK | Mode mudah/normal, bantuan langkah, uang kertas visual, narasi suara opsional, kustomisasi respons | Bantuan dasar sudah ada |
| D: Laporan guru | Kode akses siswa tanpa password admin, laporan per sesi, evaluasi kesalahan, ekspor | Rencana |
| E: Aktivitas kafe | Siswa mempraktikkan menerima pesanan, menyiapkan makanan, dan menyerahkan pesanan secara virtual | Rencana |

## Struktur komponen

src/simulation/
- VisualCustomerPage.jsx — alur sesi latihan, permintaan API, tampilan pesanan, jawaban, umpan balik dan progres
- CustomerAvatar.jsx — ilustrasi SVG statis berdasarkan persona dan mood neutral/happy/thinking
- customerProfiles.js — data empat pelanggan fiktif, pemilihan pelanggan yang konsisten per challenge ID, dialog, opsi jawaban dan formatter rupiah
- simulation.css — layout responsif, tombol besar, kontras dan fokus keyboard

Integrasi:
- src/main.jsx — menambahkan /simulasi di bawah perlindungan CloudGate serta tautan di navigasi
- src/GamePage.jsx — tautan masuk ke simulasi visual
- worker/game.js — informasi completedCount dan round untuk sesi serta tantangan; tidak membuat database baru
- src/simulation.test.mjs — validasi jawaban, kestabilan persona, dialog dan respons API

## Siklus belajar

1. Guru/pendamping login, buka /simulasi.
2. Masukkan nama panggilan singkat. Buat sesi dengan endpoint /api/game/sessions.
3. Minta soal dari /api/game/challenge. Pelanggan dan bubble muncul.
4. Siswa membaca pesanan dan uang yang diberikan; pilih salah satu kembalian.
5. Backend /api/game/answer memeriksa jawaban dan menambah poin/XP bila benar.
6. Jika kurang tepat, pelanggan mengajak mencoba lagi hingga maksimal tiga percobaan, tanpa memarahi siswa.
7. Setelah soal selesai, lanjutkan pelanggan berikutnya. Lima soal menutup sesi.
8. Sesi dapat dilanjutkan dari daftar; progres dibaca dari Neon.

## Prinsip aksesibilitas

- Tidak ada timer atau hukuman keterlambatan di MVP.
- Komponen jawaban besar dan bisa diakses keyboard, dengan indikator fokus jelas.
- Instruksi singkat, bahasa positif, umpan balik teks serta ekspresi (bukan warna saja).
- Tombol bantuan hitung tersedia dan tidak membocorkan nominal jawaban.
- Ilustrasi menggunakan SVG lokal, tanpa request gambar eksternal.
- Nama pelanggan sepenuhnya fiktif, bukan foto atau nama siswa.
- Teks rupiah memakai format Indonesia dan tidak memerlukan identitas sensitif.

## Batasan MVP

- Masih mewarisi login admin dari CloudGate, bukan akses langsung siswa.
- Hanya latihan berhitung kembalian, belum memilih produk secara interaktif.
- Persona dipilih secara deterministik per ID soal, tidak perlu kolom database.
- Game menggunakan katalog produk sebagai inspirasi soal, tetapi tidak mengurangi stok.
- Hasil backend game mengikuti sistem poin yang sudah ada.
- Butuh deployment Worker terbaru agar URL /simulasi aktif.

## Pengujian dan rilis

Jalankan:
- npm test
- npm run build
- npm run build:cloud
- node --check worker/game.js

Setelah Github Actions lulus, Cloudflare Git Integration perlu menerbitkan commit terbaru.
Buka https://pos.cadera.site/simulasi dan coba sesi latihan, jawaban salah dan benar,
progres setelah reload, serta pastikan stok/omzet Neon tidak berubah.
