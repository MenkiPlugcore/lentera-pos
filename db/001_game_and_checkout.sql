-- LENTERA POS 2.0: migration non-destruktif di database Neon lama.
-- Tabel lama (products/categories/transactions/profiles) tetap dipertahankan.
CREATE TABLE IF NOT EXISTS public.lentera_game_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 player_label text NOT NULL CHECK (char_length(player_label) BETWEEN 1 AND 80),
 role text NOT NULL CHECK (role IN ('kasir','barista','pelayan')),
 level_no int NOT NULL DEFAULT 1 CHECK (level_no BETWEEN 1 AND 100),
 score int NOT NULL DEFAULT 0 CHECK (score >= 0),
 experience int NOT NULL DEFAULT 0 CHECK (experience >= 0),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.lentera_game_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.lentera_game_sessions(id) ON DELETE CASCADE,
 task_type text NOT NULL CHECK (task_type IN ('order','change','communication','preparation','service')),
 question_key text NOT NULL,
 is_correct boolean NOT NULL,
 score_awarded int NOT NULL DEFAULT 0 CHECK (score_awarded >= 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lentera_game_sessions_created ON public.lentera_game_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lentera_game_attempts_session ON public.lentera_game_attempts(session_id,created_at DESC);

-- Checkout dalam satu transaksi database, menghitung nominal server-side dan mengunci stok.

CREATE OR REPLACE FUNCTION public.lentera_pos_checkout(p_items jsonb, p_paid numeric, p_cashier uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
 v_item record;
 v_product public.products%ROWTYPE;
 v_total numeric := 0;
 v_tx_id uuid;
 v_before integer;
BEGIN
 IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
   OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN
   RAISE EXCEPTION 'Keranjang harus berisi 1 sampai 100 jenis produk.';
 END IF;
 IF p_paid IS NULL OR p_paid < 0 OR p_paid > 1000000000000 THEN
   RAISE EXCEPTION 'Nominal pembayaran tidak valid.';
 END IF;

 FOR v_item IN
   SELECT (line.value->>'productId')::uuid AS product_id,
          SUM((line.value->>'quantity')::numeric) AS qty
   FROM jsonb_array_elements(p_items) AS line(value)
   GROUP BY 1 ORDER BY 1
 LOOP
   IF v_item.qty IS NULL OR v_item.qty <> trunc(v_item.qty) OR v_item.qty NOT BETWEEN 1 AND 999 THEN
     RAISE EXCEPTION 'Jumlah produk harus antara 1 sampai 999.';
   END IF;
   SELECT * INTO v_product FROM public.products
     WHERE id = v_item.product_id FOR UPDATE;
   IF NOT FOUND OR NOT v_product.is_active THEN
     RAISE EXCEPTION 'Produk tidak ditemukan atau sedang diarsipkan.';
   END IF;
   IF v_product.stock < v_item.qty THEN
     RAISE EXCEPTION 'Stok % tidak mencukupi.', v_product.name;
   END IF;
   v_total := v_total + v_product.selling_price * v_item.qty;
 END LOOP;

 IF p_paid < v_total THEN
   RAISE EXCEPTION 'Nominal pembayaran kurang dari total belanja.';
 END IF;

 INSERT INTO public.transactions (cashier_id, subtotal, total_amount, paid_amount,
    change_amount, payment_method, status, completed_at)
 VALUES (p_cashier, v_total, v_total, p_paid, p_paid - v_total, 'cash', 'completed', now())
 RETURNING id INTO v_tx_id;

 FOR v_item IN
   SELECT (line.value->>'productId')::uuid AS product_id,
          SUM((line.value->>'quantity')::int) AS qty
   FROM jsonb_array_elements(p_items) AS line(value)
   GROUP BY 1 ORDER BY 1
 LOOP
   SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id;
   v_before := v_product.stock;
   UPDATE public.products
      SET stock = stock - v_item.qty, updated_at = now()
     WHERE id = v_item.product_id;
   INSERT INTO public.transaction_items
      (transaction_id, product_id, product_sku, product_name, quantity, purchase_price, unit_price)
   VALUES (v_tx_id, v_product.id, v_product.sku, v_product.name,
      v_item.qty, v_product.purchase_price, v_product.selling_price);
   INSERT INTO public.stock_movements
      (product_id, transaction_id, actor_id, movement_type, quantity_change, stock_before, stock_after, reason)
   VALUES (v_product.id, v_tx_id, p_cashier, 'sale', -v_item.qty, v_before,
      v_before - v_item.qty, 'Penjualan LENTERA POS');
 END LOOP;
 RETURN v_tx_id;
END;
$function$;
