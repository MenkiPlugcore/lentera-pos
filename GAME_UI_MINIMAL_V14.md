# LENTERA POS — Simulasi Minimal UI v1.4

Tujuan: ketika permainan aktif, siswa hanya melihat informasi penting dan tidak perlu membaca paragraf panjang.

Perubahan:
- Header dan penjelasan pembuka hanya tampil di lobi. Saat bermain tetap ada judul tersembunyi untuk pembaca layar.
- HUD menunjukkan level/poin, progres pelanggan, dan tombol keluar. Nama pemain dan XP tetap tersedia pada label aksesibilitas.
- Percakapan pelanggan hanya menyapa atau memberi respons pada jawaban; nominal uang tidak diulang di balon dialog.
- Panel dalam scene menampilkan jumlah/nama produk, total belanja dan uang yang diterima. Label langkah dan harga satuan yang redundan dihilangkan.
- Ringkasan transaksi tidak ditampilkan dua kali pada desktop; ringkasan ringkas muncul hanya pada HP ketika laci uang menutupi scene.
- Laci uang mengutamakan jumlah kembalian, tombol Serahkan, dan pecahan Kertas/Koin. Baki kosong tidak menghabiskan ruang dan kontrol koreksi tampil ketika ada uang terpilih.
- Mode Fokus dan tombol Bantuan tetap tersedia; petunjuk panjang disembunyikan sampai diminta.
- Umpan balik jawaban salah dan benar tetap terlihat, termasuk batas 3 percobaan. Tidak ada perubahan logika game.
- Cache offline diperbarui agar CSS/JS baru diambil setelah deployment.

File: src/simulation/VisualCustomerPage.jsx, src/simulation/MoneyTray.jsx, src/simulation/arcade.css, src/minimal-game-ui.test.mjs, public/sw.js.

Pengecekan: npm test, npm run build, npm run build:cloud. Cek desktop dan HP pada /simulasi setelah Cloudflare memakai commit terbaru. Kegiatan ini tidak menyentuh stok nyata, tabel Neon, atau Cloudinary.