# LENTERA POS — Custom Customer Assets v1.3

## Implementasi gambar pilihan guru
Empat gambar yang disuplai dipakai dalam /simulasi:
- Background toko kosong: https://res.cloudinary.com/dvds41ivm/image/upload/v1794236695/lentera-pos/customers/toko-kosong-v1.png
- Naya, sweater ungu: https://res.cloudinary.com/dvds41ivm/image/upload/v1794236652/lentera-pos/customers/pelanggan-ungu-v1.png
- Raka, jaket biru: https://res.cloudinary.com/dvds41ivm/image/upload/v1794236677/lentera-pos/customers/pelanggan-jaket-biru-v1.png
- Bu Maya, berkacamata: https://res.cloudinary.com/dvds41ivm/image/upload/v1794236683/lentera-pos/customers/pelanggan-kacamata-v1.png

Semua gambar telah diunggah ke Cloudinary pada folder lentera-pos/customers.
Karakter dipilih deterministik berdasarkan ID tantangan, sehingga refresh tidak merandom ulang karakter dalam soal berjalan. Lobi memakai toko kosong, lalu karakter muncul setelah sesi dimulai.

## Visual & aksesibilitas
- Menggunakan foto/ilustrasi yang disediakan, bukan SVG tokoh generik yang sebelumnya.
- Background toko dibuat responsif via object-fit cover.
- Karakter memakai CSS mix-blend-mode multiply untuk menyamarkan latar putih PNG asli ketika diletakkan di atas toko. Karena belum merupakan PNG transparan, efek pada sebagian warna dapat sedikit berbeda. Alternatif jangka panjang: upload aset PNG dengan latar transparan.
- Animasi idle sangat ringan, perubahan mood sederhana (senang dan berpikir), dan otomatis nonaktif bila prefers-reduced-motion.
- Dialog, nominal, pilihan uang, skor dan XP tetap HTML aktif dan diambil dari Neon. Teks dalam gambar uang/karakter tidak digunakan untuk menentukan soal.
- Tidak ada perubahan logika transaksi, tabel Neon, atau keamanan sesi.
- Jika gambar lama terlihat, hard refresh setelah service worker diperbarui.

## Pengujian
1. Pastikan build & test React/Worker sukses pada GitHub Actions.
2. Deploy GitHub commit terbaru ke Cloudflare.
3. Buka /simulasi dan cek tiga karakter pada ronde berbeda, status benar/salah, tombol Next.
4. Cek desktop dan HP portrait, terutama crop karakter di depan meja serta keterbacaan bubble.
5. Pastikan semua foto rupiah dari admin tetap terlihat di laci uang.
