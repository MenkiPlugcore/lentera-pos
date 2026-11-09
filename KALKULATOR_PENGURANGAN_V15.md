# LENTERA POS — Kalkulator Pengurangan Geser (v1.5)

## Tujuan
Menambahkan bantuan matematika ringan di permainan /simulasi tanpa menambah teks tetap pada layar utama.

## Cara memakai
1. Mulai sesi Simulasi Pelanggan seperti biasa.
2. Desktop: tekan tombol **− Kalkulator** pada panel uang di sebelah kanan.
3. HP: tekan tombol **− Kalkulator** di sebelah tombol **Laci Uang** pada bagian bawah scene, atau tekan tombol yang sama dari dalam laci.
4. Panel geser tampil dari kanan pada desktop atau dari bawah pada HP.
5. Isian pertama otomatis diisi dengan uang pelanggan; isian kedua dengan total belanja dari soal aktif.
6. Tekan **Hitung −** untuk melihat hasil pengurangan, misalnya Rp10.000 − Rp6.000 = Rp4.000.
7. Nominal dapat diedit untuk latihan bebas. Tombol **Isi ulang** mengembalikan nominal dari soal aktif.
8. Tombol **Kembali ke permainan**, tombol X, klik pada latar gelap, atau Escape menutup panel.
9. Setelah menutup, siswa tetap harus menyusun uang dan menekan **Serahkan** sendiri. Kalkulator tidak otomatis menjawab pertanyaan, mengubah stok, atau memengaruhi poin/XP.

## Pengaturan teknis
- src/simulation/subtraction.js: fungsi aritmetika murni, validasi integer 0 s.d. 1 miliar rupiah, laporan kekurangan bila pembayaran kurang dari harga.
- src/simulation/SubtractionSlide.jsx: panel geser dengan auto-fill data transaksi aktif, reset per soal, fokus keyboard, Escape, penguncian scroll latar, dan aria dialog.
- src/simulation/subtraction.css: overlay dan transisi responsif, minimal 44px target sentuhan, prefer-reduced-motion.
- src/simulation/VisualCustomerPage.jsx: dua akses masuk kalkulator (panel uang dan area game pada HP).
- src/subtraction-calculator.test.mjs: pengujian matematika dan integrasi UI.
- public/sw.js: cache baru v12 untuk pembaruan frontend.

Tidak memerlukan perubahan database Neon, Cloudflare secrets, Cloudinary, atau API.

## Verifikasi
- npm test
- npm run build
- npm run build:cloud
- Di desktop: buka panel, hitung, ubah angka, reset, tutup, lalu pilih uang.
- Di HP: buka panel langsung dari scene; tutup kembali ke game. Tes juga ketika laci uang dalam kondisi terbuka.
- Coba pembayaran sama dengan total (Rp0), uang kurang dari belanja, serta angka tidak valid.
- Pastikan hasil kalkulator tidak mengirim jawaban ke server sampai siswa menekan Serahkan.
