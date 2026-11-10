# LENTERA POS — Empat Pelanggan Fantasi Tambahan (v1.8)

Tambahan empat ilustrasi yang diberikan guru: kucing oranye Milo, hantu ramah Boo, iblis kecil Rubi, dan malaikat Aura. Ketiganya yang lama (Naya, Raka, Bu Maya) tetap digunakan, total tujuh tokoh pelanggan.

## Implementasi
- Gambar keempat pelanggan diunggah ke Cloudinary `lentera-pos/customers`.
- Latar putih setiap gambar diproses menjadi PNG transparan melalui transformasi `e_make_transparent:15/f_png`, supaya menyatu di scene toko.
- Pelanggan dipilih melalui hash ID tantangan. ID tantangan pada sistem 40 level lokal dibuat acak; hasil pilihan stabil untuk soal yang sama, termasuk setelah refresh atau melanjutkan level.
- Pemilihan tidak mengubah skor, level, keranjang, penilaian, transaksi atau stok asli.
- Empat karakter baru mendapat nama dan sapaan singkat berbeda.
- Service worker cache diperbarui v15 agar rilis UI baru diprioritaskan.

## Aset
- Milo: https://res.cloudinary.com/dvds41ivm/image/upload/e_make_transparent:15/f_png/v1794273464/lentera-pos/customers/pelanggan-kucing-v1.png
- Boo: https://res.cloudinary.com/dvds41ivm/image/upload/e_make_transparent:15/f_png/v1794273473/lentera-pos/customers/pelanggan-hantu-v1.png
- Rubi: https://res.cloudinary.com/dvds41ivm/image/upload/e_make_transparent:15/f_png/v1794273481/lentera-pos/customers/pelanggan-iblis-v1.png
- Aura: https://res.cloudinary.com/dvds41ivm/image/upload/e_make_transparent:15/f_png/v1794273489/lentera-pos/customers/pelanggan-malaikat-v1.png

## Tes
- `npm test`: memastikan tujuh pelanggan unik, keempat aset baru transparan, hash deterministik menghasilkan variasi, dan semua tes eksisting tetap lulus.
- `npm run build` dan `npm run build:cloud`.
- Buka /simulasi, mulai atau lanjutkan level, layani beberapa pelanggan untuk melihat semua jenis karakter.
- Refresh di tengah pelanggan dan periksa karakter tetap sama.
- Periksa posisi gambar di belakang meja pada desktop dan HP serta latar putih benar-benar tidak muncul.

Catatan: variasi acak tidak menjamin seluruh tujuh pelanggan muncul dalam lima soal pertama. Lima pelanggan dipilih independen dan bisa mengulang karakter.
