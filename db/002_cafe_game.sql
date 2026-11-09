-- LENTERA POS Smart Cafe + Kasir Pintar
-- Migration additive. Tested first on an isolated Neon branch.
-- Never drop existing products, transactions, profiles or game session records.

CREATE SEQUENCE IF NOT EXISTS public.lentera_cafe_order_seq;

CREATE TABLE IF NOT EXISTS public.lentera_cafe_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_code text NOT NULL UNIQUE DEFAULT ('CAFE-' || to_char(now() AT TIME ZONE 'Asia/Jakarta','YYYYMMDD') || '-' || lpad(nextval('public.lentera_cafe_order_seq')::text, 5, '0')),
 table_label text NOT NULL CHECK (char_length(table_label) BETWEEN 1 AND 30),
 notes text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','preparing','ready','served','cancelled')),
 total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
 transaction_id uuid UNIQUE REFERENCES public.transactions(id) ON DELETE RESTRICT,
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lentera_cafe_order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.lentera_cafe_orders(id) ON DELETE CASCADE,
 product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
 sku text NOT NULL,
 name text NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 999),
 unit_price numeric NOT NULL CHECK(unit_price >= 0),
 subtotal numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lentera_cafe_orders_recent ON public.lentera_cafe_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lentera_cafe_orders_status ON public.lentera_cafe_orders(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lentera_cafe_order_items_order ON public.lentera_cafe_order_items(order_id);

CREATE TABLE IF NOT EXISTS public.lentera_game_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.lentera_game_sessions(id) ON DELETE CASCADE,
 item_name text NOT NULL CHECK(char_length(item_name) BETWEEN 2 AND 120),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 5),
 unit_price integer NOT NULL CHECK(unit_price >= 0),
 total_amount integer NOT NULL CHECK(total_amount >= 0),
 paid_amount integer NOT NULL CHECK(paid_amount >= total_amount),
 correct_change integer NOT NULL CHECK(correct_change = paid_amount - total_amount),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 is_correct boolean,
 resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lentera_game_one_pending ON public.lentera_game_challenges(session_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lentera_game_challenges_recent ON public.lentera_game_challenges(session_id,created_at DESC);

-- lentera_cafe_new
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
   IF v_product.stock < v_item.qty THEN
     RAISE EXCEPTION 'Stok % tidak mencukupi.',v_product.name;
   END IF;
   INSERT INTO public.lentera_cafe_order_items(order_id,product_id,sku,name,quantity,unit_price)
     VALUES(v_order,v_product.id,v_product.sku,v_product.name,v_item.qty::integer,v_product.selling_price);
   v_total := v_total + v_product.selling_price * v_item.qty;
 END LOOP;
 UPDATE public.lentera_cafe_orders SET total_amount=v_total WHERE id=v_order;
 RETURN v_order;
END;
$function$;

-- lentera_cafe_pay
CREATE OR REPLACE FUNCTION public.lentera_cafe_pay(p_order_id uuid, p_paid numeric, p_actor uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
 v_order public.lentera_cafe_orders%ROWTYPE;
 v_items jsonb;
 v_transaction uuid;
BEGIN
 SELECT * INTO v_order FROM public.lentera_cafe_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pesanan tidak ditemukan.'; END IF;
 IF v_order.transaction_id IS NOT NULL THEN RAISE EXCEPTION 'Pesanan ini sudah dibayar.'; END IF;
 IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'Hanya pesanan baru yang dapat dibayar.'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.lentera_cafe_order_items i LEFT JOIN public.products p ON p.id=i.product_id
  WHERE i.order_id=v_order.id AND (p.id IS NULL OR NOT p.is_active OR p.selling_price<>i.unit_price)
 ) THEN RAISE EXCEPTION 'Menu atau harga berubah. Batalkan dan buat ulang pesanan.'; END IF;
 SELECT jsonb_agg(jsonb_build_object('productId',i.product_id,'quantity',i.quantity))
  INTO v_items FROM public.lentera_cafe_order_items i WHERE i.order_id=v_order.id;
 SELECT public.lentera_pos_checkout(v_items,p_paid,p_actor) INTO v_transaction;
 UPDATE public.lentera_cafe_orders SET transaction_id=v_transaction,updated_at=now() WHERE id=v_order.id;
 RETURN v_transaction;
END;
$function$;

-- lentera_cafe_set_status
CREATE OR REPLACE FUNCTION public.lentera_cafe_set_status(p_order_id uuid, p_status text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
 v_old public.lentera_cafe_orders%ROWTYPE;
BEGIN
 SELECT * INTO v_old FROM public.lentera_cafe_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pesanan tidak ditemukan.'; END IF;
 IF v_old.status='cancelled' OR v_old.status='served' THEN
  RAISE EXCEPTION 'Pesanan sudah ditutup.';
 END IF;
 IF p_status='cancelled' THEN
   IF v_old.transaction_id IS NOT NULL THEN
     RAISE EXCEPTION 'Pesanan dibayar tidak dapat dibatalkan lewat antrean. Perlu prosedur refund.';
   END IF;
 ELSIF p_status='preparing' AND v_old.status='pending' THEN
   IF v_old.transaction_id IS NULL THEN RAISE EXCEPTION 'Bayar dulu sebelum diproses.'; END IF;
 ELSIF p_status='ready' AND v_old.status='preparing' THEN
   NULL;
 ELSIF p_status='served' AND v_old.status='ready' THEN
   NULL;
 ELSE RAISE EXCEPTION 'Perpindahan status tidak diizinkan.'; END IF;
 UPDATE public.lentera_cafe_orders SET status=p_status,updated_at=now() WHERE id=p_order_id;
 RETURN p_status;
END;
$function$;

-- lentera_game_answer
CREATE OR REPLACE FUNCTION public.lentera_game_answer(p_challenge_id uuid, p_answer integer)
 RETURNS TABLE(correct boolean, attempt_count integer, resolved boolean, expected_change integer, session_score integer, session_xp integer, session_level integer, session_status text)
 LANGUAGE plpgsql
AS $function$
DECLARE
 v_ch public.lentera_game_challenges%ROWTYPE;
 v_s public.lentera_game_sessions%ROWTYPE;
 v_correct boolean;
 v_resolved boolean;
 v_attempts int;
 v_points int;
 v_completed int;
BEGIN
 SELECT * INTO v_ch FROM public.lentera_game_challenges WHERE id=p_challenge_id FOR UPDATE;
 IF NOT FOUND OR v_ch.resolved_at IS NOT NULL THEN RAISE EXCEPTION 'Soal tidak ditemukan atau sudah selesai.'; END IF;
 SELECT * INTO v_s FROM public.lentera_game_sessions WHERE id=v_ch.session_id FOR UPDATE;
 IF v_s.status<>'active' THEN RAISE EXCEPTION 'Sesi latihan sudah ditutup.'; END IF;
 IF p_answer IS NULL OR p_answer<0 THEN RAISE EXCEPTION 'Jawaban harus angka positif.'; END IF;
 v_correct := (p_answer=v_ch.correct_change);
 v_attempts := v_ch.attempts+1;
 v_resolved := v_correct OR v_attempts>=3;
 v_points := CASE WHEN v_correct THEN GREATEST(5,20-(v_attempts-1)*5) ELSE 0 END;
 UPDATE public.lentera_game_challenges
 SET attempts=v_attempts,is_correct=CASE WHEN v_resolved THEN v_correct ELSE NULL END,
     resolved_at=CASE WHEN v_resolved THEN now() ELSE NULL END
 WHERE id=v_ch.id;
 INSERT INTO public.lentera_game_attempts(session_id,task_type,question_key,is_correct,score_awarded)
 VALUES(v_s.id,'change',v_ch.id::text,v_correct,v_points);
 SELECT count(*) INTO v_completed FROM public.lentera_game_challenges
 WHERE session_id=v_s.id AND resolved_at IS NOT NULL;
 UPDATE public.lentera_game_sessions
 SET score=score+v_points,experience=experience+v_points,
     level_no=LEAST(100,1+((experience+v_points)/100)),
     status=CASE WHEN v_completed>=5 THEN 'completed' ELSE status END,
     completed_at=CASE WHEN v_completed>=5 THEN now() ELSE completed_at END
 WHERE id=v_s.id
 RETURNING * INTO v_s;
 RETURN QUERY SELECT v_correct,v_attempts,v_resolved,
   CASE WHEN v_resolved THEN v_ch.correct_change ELSE NULL END,
   v_s.score,v_s.experience,v_s.level_no,v_s.status;
END;
$function$;
