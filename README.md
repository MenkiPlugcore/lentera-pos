# LENTERA POS

LENTERA POS adalah aplikasi point-of-sale untuk praktik siswa TKJ. Stack awal: React + Vite + Tailwind CSS, Cloudflare Pages/Functions, dan Neon Postgres.

## Status v0.1

- Neon production schema aktif
- Generator SKU internal `LP000001`
- Struktur produk, transaksi, stok, laporan, dan mode praktik
- Cloudflare Function health-check ke Neon

## Security

Jangan commit `DATABASE_URL` atau kredensial Neon ke repository. Simpan secret di Cloudflare environment variables.
