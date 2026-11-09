-- LENTERA POS v1.6: keranjang multi-produk untuk mode game.
-- Hanya menambah kolom tabel latihan; produk, stok dan transaksi tidak dimodifikasi.
-- NULL mempertahankan kompatibilitas soal satu barang dari versi sebelumnya.
ALTER TABLE public.lentera_game_challenges
  ADD COLUMN IF NOT EXISTS items jsonb;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lentera_game_challenge_items_valid'
      AND conrelid = 'public.lentera_game_challenges'::regclass
  ) THEN
    ALTER TABLE public.lentera_game_challenges
      ADD CONSTRAINT lentera_game_challenge_items_valid
      CHECK (
        items IS NULL OR (
          jsonb_typeof(items) = 'array'
          AND jsonb_array_length(items) BETWEEN 1 AND 5
        )
      );
  END IF;
END
$migration$;

COMMENT ON COLUMN public.lentera_game_challenges.items IS
  'Snapshot 1-5 barang pada keranjang game; tidak memengaruhi persediaan atau omzet asli.';
