# LENTERA POS — Uang Interaktif (Simulasi Pelanggan v0.2)

Halaman: https://pos.cadera.site/simulasi
Repository: MenkiPlugcore/lentera-pos

## Fungsi
Siswa mempersiapkan uang kembalian pelanggan secara visual, bukan hanya memilih jawaban angka. Guru bisa berpindah ke mode **Pilihan Cepat** untuk bantuan bertahap. Simulasi tidak mengurangi stok, tidak memproses pembayaran asli, dan tidak mengubah omzet.

## Pecahan
- Uang kertas ilustrasi latihan: Rp1.000, Rp2.000, Rp5.000, Rp10.000, Rp20.000, Rp50.000, Rp100.000.
- Koin ilustrasi latihan: Rp100, Rp200, Rp500.
- Desain dibuat dengan HTML/CSS untuk simulasi; **bukan gambar atau replika uang resmi**.
- Soal game baru menggunakan produk aktif dengan harga kelipatan Rp100, sehingga nominal uang kembalian dapat disusun dari pecahan yang tersedia. Soal lama dengan nominal yang tidak cocok otomatis dialihkan ke Pilihan Cepat.

## Cara bermain
1. Guru membuka /simulasi lalu memulai atau melanjutkan sesi Kasir Pintar.
2. Pelanggan virtual menyebut pesanan dan membayar dengan uang latihan.
3. Di mode **Susun Uang**, siswa mengetuk pecahan untuk memasukkannya ke baki.
4. Total kembalian dihitung langsung dari pecahan yang sudah dipilih; tidak ada nilai ataupun penalti saat siswa sekadar mencoba menyusun uang.
5. Siswa dapat **Batalkan Terakhir**, **Kurangi 1** pada pecahan tertentu, atau **Kosongkan Baki**.
6. Setelah yakin, siswa menekan **Serahkan Kembalian**. Barulah aplikasi mengirim nominal ke /api/game/answer yang dinilai di Neon.
7. Jika jawaban kurang tepat, siswa dapat memperbaiki sampai tiga percobaan dalam soal yang sama. Jika benar, pelanggan tersenyum dan XP/score diperbarui.
8. Tombol **Uang Pas** tersedia untuk kasus tidak ada kembalian (Rp0). Soal saat ini biasanya membutuhkan kembalian positif.
9. Mode **Pilihan Cepat** tetap menyediakan tiga jawaban angka seperti versi sebelumnya.

## Prinsip aksesibilitas
- Tombol ukuran besar, kontras tinggi, label ARIA, dan fokus keyboard terlihat jelas.
- Tanpa hitung mundur atau tekanan waktu.
- Ada bantuan menghitung kembalian, perintah singkat, dan respons positif.
- Pecahan yang lebih besar dari uang pelanggan atau membuat baki melebihi uang pelanggan akan dinonaktifkan.
- Maksimal 60 lembar/koin dalam baki. Gunakan pecahan lebih besar jika sudah penuh.
- Bentuk dan label angka membedakan uang, tidak mengandalkan warna saja.
- Tidak menggunakan data anak, aset eksternal, atau file gambar tambahan.

## Arsitektur
- src/simulation/cashMoney.js: pecahan dan operasi uang yang diuji terpisah (pure functions).
- src/simulation/MoneyTray.jsx: laci uang, kartu banknot/koin, baki, pembatalan dan serahkan jawaban.
- src/simulation/VisualCustomerPage.jsx: integrasi mode uang interaktif dengan sesi Kasir Pintar.
- src/simulation/simulation.css: styling uang tiruan, responsif mobile dan aksesibilitas.
- src/cash-money.test.mjs: uji nominal, pecahan unik, immutability, batas bakip, dan larangan uang melebihi pembayaran.
- worker/game.js: soal baru disaring agar harga kelipatan Rp100.

## Verifikasi rilis
- npm test
- npm run build
- npm run build:cloud
- node --check worker/game.js
- Deploy commit terbaru pada Cloudflare Worker dan refresh /simulasi.
- Uji Rp20.000 dibayar untuk Rp13.000 belanja: pilih Rp5.000 + Rp2.000, total harus Rp7.000.
- Uji harga Rp1.500 agar koin Rp500 benar-benar bisa digunakan.
- Coba salah → perbaiki pilihan → jawab benar; cek XP dan skor Neon.
- Pastikan tabel products.stock dan transactions tidak berubah selama menjalankan game.
