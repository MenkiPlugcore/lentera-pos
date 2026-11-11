# LENTERA POS v1.11.2 — Hapus Produk Permanen untuk Praktik

## Perubahan
- Pada halaman `/admin/produk`, tombol **Hapus** tersedia pada setiap produk, termasuk produk aktif atau yang pernah diarsipkan.
- Hapus membutuhkan dua langkah: ketik SKU produk yang benar pada prompt, kemudian konfirmasi akhir.
- Produk hilang dari daftar setelah berhasil dihapus. Kesalahan API tetap ditampilkan ke admin.
- Tombol Edit/Hapus dinonaktifkan sementara ketika penghapusan sedang berjalan.
- Tombol Arsipkan di daftar diganti Hapus; fungsi arsip backend dan status is_active masih tersedia untuk kompatibilitas.
- Panel hapus mengambang yang duplikat di `/admin` cloud dihilangkan; dalam mode lokal panel lama tetap ada.

## Perilaku database Neon yang sudah diverifikasi
Skema proyek `lentera-pos-tkj` telah diperiksa tanpa mengubah data:
- `public.transaction_items.product_id` memiliki FK `ON DELETE SET NULL`. Nama, SKU, harga, jumlah, subtotal transaksi lama tersimpan sebagai snapshot.
- `public.lentera_cafe_order_items.product_id` memiliki FK `ON DELETE SET NULL`; riwayat item kafe tetap tersimpan.
- `public.stock_movements.product_id` memiliki FK `ON DELETE CASCADE`; hanya riwayat pergerakan stok milik produk yang dihapus ikut hilang.
- Tidak ada FK lain yang mereferensikan `public.products` menurut `pg_constraint` saat pemeriksaan.
- Karena itu `DELETE FROM public.products WHERE id=$1::uuid RETURNING id,sku,name` dapat menghapus produk meski pernah digunakan latihan, dan struk lama tidak ikut terhapus.
- Gambar yang telah disimpan di Cloudinary tidak otomatis dihapus dari layanan penyimpanan media.

## Isolasi dan keamanan
- Endpoint tetap `/api/products/:id/hard-delete`, hanya menerima DELETE dan meminta sesi admin yang sah.
- Produk yang pernah dijual tidak lagi otomatis ditolak oleh guard `NOT EXISTS`.
- Mode lokal juga memutus hubungan productId dari snapshot transaksi tanpa menghapus transaksi maupun isi struk.
- Tidak ada penghapusan produk yang dilakukan selama implementasi; fitur baru berjalan hanya ketika admin menekan Hapus dan menyelesaikan konfirmasi.
- Tindakan permanen tidak bisa di-undo. Sebaiknya backup dahulu bila diperlukan.

## Validasi
1. `npm test`, `npm run build`, `npm run build:cloud`.
2. Buka `/admin/produk`, klik Hapus pada sebuah produk latihan dan masukkan SKU yang sesuai.
3. Pastikan produk hilang dari daftar dan tidak muncul di katalog kasir maupun simulasi berikutnya.
4. Jika produk sudah dipakai transaksi latihan, periksa laporan/struk lama masih menampilkan nama, SKU, jumlah dan total.
5. Periksa skenario salah ketik SKU atau menolak konfirmasi: produk tidak terhapus.

Catatan: pengujian API tidak melakukan penghapusan terhadap data Neon produksi; fitur baru harus diuji pada produk dummy setelah deployment.
