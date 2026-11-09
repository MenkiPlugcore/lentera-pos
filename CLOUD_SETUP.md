# LENTERA POS 2.0 — Database Cloud

## Status fase 1–2
- Database Neon yang dipakai: lentera-pos-tkj (project quiet-moon-34600763).
- Skema tambahan db/001_game_and_checkout.sql sudah diterapkan pada 9 November 2026 tanpa menghapus data lama.
- Mode game masih tahap fondasi database, gameplay belum dibuat.
- Tampilan kasir, manajemen produk, stok, dan laporan memakai API Cloudflare Worker ketika aplikasi dibangun dalam mode cloud.
- Login admin menggunakan akun lama pada tabel profiles dan admin_credentials (bcrypt).
- Mode lokal tetap dipertahankan pada build biasa agar data pengguna lama tidak hilang.

## Deploy cloud (frontend + API satu domain)
1. Dari repository, jalankan npm install.
2. Login Cloudflare: npx wrangler login.
3. Di Neon Console, buka proyek lentera-pos-tkj, ambil connection string database dari Connection Details.
4. Di terminal yang sudah terhubung ke akun Cloudflare, set secret dengan npx wrangler secret put DATABASE_URL lalu tempel URL koneksi dari Neon.
5. Jalankan npm run deploy:cloud. Ini membangun frontend dengan VITE_POS_MODE=cloud, lalu deploy Worker beserta static assets.
6. Buka domain Worker dan login dengan akun admin dari Neon lama.
7. Setelah lolos pengujian, hubungkan domain produksi di Workers > Settings > Domains & Routes.

Jangan sekali-kali menaruh DATABASE_URL atau password di GitHub, localStorage, atau variabel VITE_. Hanya Worker yang boleh membaca DATABASE_URL. Secret Cloudflare perlu dibuat pada nama Worker yang benar, yaitu lentera-pos.

Build GitHub/Vite biasa (npm run build) masih berjalan dalam mode lokal; commit ke GitHub saja TIDAK otomatis membuat situs lama menggunakan database.

## Testing
- npm test
- node --check worker/index.js
- npm run build
- npm run build:cloud
- Lokal Worker: buat file .dev.vars yang tidak masuk git, berisi DATABASE_URL=... lalu npm run dev:cloud.
- API mode cloud: GET /api/health mengembalikan mode cloud. Selain health dan login, seluruh API mengharuskan login admin.

## Fitur admin
- /admin: ringkasan database, kategori, produk, stok, laporan, arsip, dan alat import katalog dari browser lokal.
- /kasir: transaksi aman di database, stok dikurangi secara atomik.
- Sesi memakai cookie Secure HttpOnly SameSite=Lax; token disimpan di database sebagai hash.
- Setelah lima percobaan gagal, akun dikunci sementara selama 15 menit. Gunakan Cloudflare WAF atau rate limiting untuk perlindungan tambahan.

## Migrasi dari data lokal
Sebelum mengganti domain produksi, unduh cadangan JSON dari LENTERA POS mode lokal. Simpan file di luar browser. Pada situs cloud, login ke /admin dan impor kategori serta produk dari browser asal atau dari file JSON.

Import bersifat additive: tidak menimpa data produk, SKU, dan barcode yang sudah ada di Neon. Jika nama, SKU, atau barcode cocok, produk dilewati. Riwayat transaksi dari browser lama BELUM ikut dimigrasikan, karena perlu rekonsiliasi terpisah agar tidak terjadi duplikasi laporan omzet. Simpan cadangan JSON lama dan jangan menghapus penyimpanan lama sebelum audit.

Database cloud tetap memerlukan backup berkala. Kegagalan koneksi harus ditampilkan sebagai error, jangan diam-diam pindah ke transaksi lokal.

## API
- POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout
- GET /api/dashboard, GET/POST /api/categories
- GET/POST /api/products, PATCH/DELETE /api/products/:id, DELETE /api/products/:id/hard-delete
- POST /api/pos/checkout
- GET /api/reports/sales, GET /api/transactions
- POST /api/migration/catalog (hanya kategori dan produk)
- GET /api/game/summary (fondasi game), GET /api/health

## Roadmap
Fase 3: pesanan kafe, nomor meja, barista/pelayan.
Fase 4: pelanggan virtual, XP, level, latihan berhitung dan kembalian, bantuan visual ABK.
Fase 5: profil siswa, penilaian guru, laporan pembelajaran, dan backup otomatis.

Mode game harus terisolasi dari tabel transaksi dan pengurangan stok nyata.

## Cloudinary Media Upload (LENTERA POS 2.1)

Koneksi Cloudinary yang terhubung memakai Cloud Name publik `dvds41ivm`, sudah dicatat sebagai
`CLOUDINARY_CLOUD_NAME` di `wrangler.jsonc` (vars, bukan rahasia). Folder Cloudinary
`lentera-pos/products` sudah dibuat.

**Wajib diselesaikan di Cloudflare Worker `lentera-pos` sebelum upload gambar:**

1. Buka Cloudinary Console > Settings > API Keys untuk melihat API Key dan API Secret milik environment `dvds41ivm`.
2. Buka Cloudflare Dashboard > Workers & Pages > `lentera-pos` > Settings > Variables and Secrets.
3. Buat **Secret** `CLOUDINARY_API_KEY` dan **Secret** `CLOUDINARY_API_SECRET`.
   Jangan masukkan ke GitHub, `.env` yang ter-commit, `VITE_` variable, atau chat.
4. Deploy ulang Worker yang sama dengan `npm run deploy:cloud` dari terminal di folder repository
   (atau build command `npm run build:cloud` / deploy command `npx wrangler deploy` pada Cloudflare Git integration).
5. Kunjungi `https://pos.cadera.site/api/health`, verifikasi `cloudinaryConfigured: true`.
   Jika false, cek secret dan nama Worker. `databaseConfigured: true` hanya menunjukkan secret Neon ada.
6. Login `https://pos.cadera.site/admin`, pilih produk > unggah foto > Simpan.
   Di mode cloud, foto dikompresi di browser, dikirim ke Worker yang memeriksa sesi admin,
   lalu Worker mengunggahnya ke Cloudinary dengan signature rahasia di sisi server.
   Kolom `products.image_url` di Neon hanya menerima URL hasil Cloudinary untuk foto baru.

**Migrasi foto lama tanpa menghapus produk:**

- Database Neon semula memiliki 6 foto Base64 dan 1 foto dari URL eksternal.
- Di `/admin` akan muncul panel **Cloudinary · Foto Produk**.
- Pastikan `Cloudinary` tertulis terhubung; gunakan tombol **Migrasikan Foto Lama ke Cloudinary**.
- Setiap foto Base64 diunggah satu per satu. URL baru disimpan dengan update kondisional
  hanya jika upload berhasil; Base64 lama tetap ada jika unggahan gagal.
- Foto URL pihak ketiga (bukan Base64) tidak otomatis disalin. Buka produknya lalu
  pilih unggah ulang gambar yang memang boleh digunakan.
- Jangan hapus backup Neon sebelum audit foto hasil migrasi. Menekan **Hapus Gambar**
  pada produk menghapus referensi di Neon, bukan aset fisik di Cloudinary.

**Keamanan:** Cloudinary API Secret tidak pernah dikirim ke browser. Upload harus lewat
session admin yang sudah login; Cloudflare Worker melakukan signing dan validasi MIME,
ukuran foto kompresi serta folder target. Lindungi endpoint dengan Cloudflare WAF rate
limits jika aplikasi makin ramai. Mode lokal (`npm run dev`) tetap menyimpan Base64 di browser.

Testing: `npm test` juga menjalankan tes signing dan validasi Cloudinary menggunakan
mock (tanpa mengunggah foto nyata). Tes live upload perlu dijalankan setelah secret Worker
ditambahkan. Konfigurasi Cloudinary tidak memengaruhi kasir/checkout saat belum aktif.
