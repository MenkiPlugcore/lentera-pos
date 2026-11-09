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
