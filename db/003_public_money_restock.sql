-- LENTERA POS: public practice, secure guest sessions, uploaded money images, optional auto-stock.
-- Additive migration. No production inventory records are altered until admin enables restock.

CREATE TABLE IF NOT EXISTS public.lentera_money_media(
 denomination integer PRIMARY KEY CHECK (denomination IN (100,200,500,1000,2000,5000,10000,20000,50000,100000)),
 kind text NOT NULL CHECK (kind IN ('note','coin')),
 image_url text,
 updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.lentera_money_media(denomination,kind) VALUES
 (100,'coin'),(200,'coin'),(500,'coin'),(1000,'note'),(2000,'note'),
 (5000,'note'),(10000,'note'),(20000,'note'),(50000,'note'),(100000,'note')
 ON CONFLICT(denomination) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.lentera_game_guest_devices(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 token_hash text NOT NULL UNIQUE CHECK (length(token_hash)=64),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lentera_game_sessions ADD COLUMN IF NOT EXISTS guest_id uuid REFERENCES public.lentera_game_guest_devices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lentera_game_sessions_guest_recent ON public.lentera_game_sessions(guest_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lentera_game_guest_expiry ON public.lentera_game_guest_devices(expires_at);

CREATE TABLE IF NOT EXISTS public.lentera_stock_policy(
 id smallint PRIMARY KEY DEFAULT 1 CHECK (id=1),
 enabled boolean NOT NULL DEFAULT false,
 refill_quantity integer NOT NULL DEFAULT 20 CHECK(refill_quantity BETWEEN 1 AND 1000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.lentera_stock_policy(id,enabled,refill_quantity) VALUES(1,false,20) ON CONFLICT (id) DO NOTHING;

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
 v_auto boolean := false;
 v_pack integer := 20;
 v_add integer;
BEGIN
 SELECT enabled,refill_quantity INTO v_auto,v_pack FROM public.lentera_stock_policy WHERE id=1;
 v_auto := coalesce(v_auto,false);
 v_pack := coalesce(v_pack,20);
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
   IF v_product.stock < v_item.qty AND NOT v_auto THEN
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
   IF v_before < v_item.qty THEN
     v_add := ceil((v_item.qty - v_before)::numeric / v_pack)::integer * v_pack;
     IF v_before + v_add > 2147483647 THEN RAISE EXCEPTION 'Stok terlalu besar.'; END IF;
     UPDATE public.products SET stock=stock+v_add,updated_at=now() WHERE id=v_product.id;
     INSERT INTO public.stock_movements
       (product_id,transaction_id,actor_id,movement_type,quantity_change,stock_before,stock_after,reason)
     VALUES (v_product.id,v_tx_id,p_cashier,'restock',v_add,v_before,v_before+v_add,
       'Auto-restock simulasi sebelum penjualan');
     v_before := v_before+v_add;
   END IF;
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
   IF v_auto AND v_before - v_item.qty = 0 THEN
      UPDATE public.products SET stock=v_pack,updated_at=now() WHERE id=v_product.id;
      INSERT INTO public.stock_movements
        (product_id,transaction_id,actor_id,movement_type,quantity_change,stock_before,stock_after,reason)
      VALUES (v_product.id,v_tx_id,p_cashier,'restock',v_pack,0,v_pack,
        'Auto-restock simulasi setelah stok habis');
   END IF;
 END LOOP;
 RETURN v_tx_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.lentera_cafe_new(p_table text, p_notes text, p_items jsonb, p_actor uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
 v_item record;
 v_product public.products%ROWTYPE;
 v_order uuid;
 v_total numeric := 0;
BEGIN
 IF p_table IS NULL OR char_length(btrim(p_table)) NOT BETWEEN 1 AND 30 THEN
   RAISE EXCEPTION 'Nomor meja harus 1-30 karakter.';
 END IF;
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 60 THEN
   RAISE EXCEPTION 'Keranjang pesanan harus 1-60 jenis produk.';
 END IF;
 INSERT INTO public.lentera_cafe_orders(table_label,notes,created_by)
 VALUES(btrim(p_table),left(coalesce(p_notes,''),300),p_actor) RETURNING id INTO v_order;
 FOR v_item IN
   SELECT (item.value->>'productId')::uuid product_id,
     sum((item.value->>'quantity')::numeric) qty
   FROM jsonb_array_elements(p_items) item(value)
   GROUP BY 1 ORDER BY 1
 LOOP
   IF v_item.product_id IS NULL OR v_item.qty IS NULL OR v_item.qty<>trunc(v_item.qty) OR v_item.qty NOT BETWEEN 1 AND 999 THEN
     RAISE EXCEPTION 'Jumlah produk harus 1-999.';
   END IF;
   SELECT * INTO v_product FROM public.products WHERE id=v_item.product_id;
   IF NOT FOUND OR NOT v_product.is_active THEN
     RAISE EXCEPTION 'Produk tidak tersedia.';
   END IF;
   IF v_product.stock < v_item.qty AND
     NOT coalesce((SELECT enabled FROM public.lentera_stock_policy WHERE id=1),false)
   THEN RAISE EXCEPTION 'Stok % tidak mencukupi.',v_product.name; END IF;
   INSERT INTO public.lentera_cafe_order_items(order_id,product_id,sku,name,quantity,unit_price)
     VALUES(v_order,v_product.id,v_product.sku,v_product.name,v_item.qty::integer,v_product.selling_price);
   v_total := v_total + v_product.selling_price * v_item.qty;
 END LOOP;
 UPDATE public.lentera_cafe_orders SET total_amount=v_total WHERE id=v_order;
 RETURN v_order;
END;
$function$;
