CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE app_role AS ENUM ('admin','teacher','cashier','student');
CREATE TYPE transaction_status AS ENUM ('pending','completed','cancelled');
CREATE TYPE payment_method AS ENUM ('cash','qris','transfer','other');
CREATE TYPE stock_movement_type AS ENUM ('initial','restock','sale','adjustment','return','void');
CREATE TYPE practice_status AS ENUM ('draft','active','completed','cancelled');

CREATE SEQUENCE product_sku_seq START 1;
CREATE SEQUENCE transaction_invoice_seq START 1;

CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id text UNIQUE,
  username text UNIQUE,
  full_name text NOT NULL,
  role app_role NOT NULL DEFAULT 'cashier',
  class_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE DEFAULT ('LP' || lpad(nextval('product_sku_seq')::text, 6, '0')),
  barcode text UNIQUE,
  barcode_type text NOT NULL DEFAULT 'CODE128' CHECK (barcode_type IN ('CODE128','EAN13','UPC','OTHER')),
  barcode_generated boolean NOT NULL DEFAULT true,
  name text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  purchase_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  selling_price numeric(14,2) NOT NULL CHECK (selling_price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  minimum_stock integer NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  image_url text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status practice_status NOT NULL DEFAULT 'draft',
  target_transactions integer NOT NULL DEFAULT 5 CHECK (target_transactions > 0),
  completed_transactions integer NOT NULL DEFAULT 0 CHECK (completed_transactions >= 0),
  mistake_count integer NOT NULL DEFAULT 0 CHECK (mistake_count >= 0),
  accuracy_score numeric(5,2) CHECK (accuracy_score BETWEEN 0 AND 100),
  speed_score numeric(5,2) CHECK (speed_score BETWEEN 0 AND 100),
  final_score numeric(5,2) CHECK (final_score BETWEEN 0 AND 100),
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL UNIQUE DEFAULT ('TRX-' || to_char((now() AT TIME ZONE 'Asia/Jakarta'), 'YYYYMMDD') || '-' || lpad(nextval('transaction_invoice_seq')::text, 6, '0')),
  cashier_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  practice_session_id uuid REFERENCES practice_sessions(id) ON DELETE SET NULL,
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  change_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (change_amount >= 0),
  payment_method payment_method NOT NULL DEFAULT 'cash',
  status transaction_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

CREATE TABLE transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_sku text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  purchase_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  movement_type stock_movement_type NOT NULL,
  quantity_change integer NOT NULL CHECK (quantity_change <> 0),
  stock_before integer NOT NULL CHECK (stock_before >= 0),
  stock_after integer NOT NULL CHECK (stock_after >= 0),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings(key, value) VALUES
  ('store_profile', '{"name":"LENTERA POS","currency":"IDR","timezone":"Asia/Jakarta"}'::jsonb),
  ('barcode', '{"prefix":"LP","format":"CODE128","digits":6}'::jsonb),
  ('practice', '{"default_target_transactions":5}'::jsonb);

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active_stock ON products(is_active, stock);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_cashier ON transactions(cashier_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status, created_at DESC);
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_product ON transaction_items(product_id);
CREATE INDEX idx_stock_movements_product_created ON stock_movements(product_id, created_at DESC);
CREATE INDEX idx_practice_sessions_student ON practice_sessions(student_id, created_at DESC);

CREATE VIEW v_low_stock_products AS
SELECT p.id, p.sku, p.barcode, p.name, c.name AS category_name, p.stock, p.minimum_stock, p.selling_price
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.is_active = true AND p.stock <= p.minimum_stock;

CREATE VIEW v_daily_sales AS
SELECT (t.completed_at AT TIME ZONE 'Asia/Jakarta')::date AS sale_date,
       count(*) AS transaction_count,
       sum(t.total_amount) AS revenue,
       sum(t.paid_amount) AS paid_amount,
       sum(t.change_amount) AS change_amount
FROM transactions t
WHERE t.status = 'completed'
GROUP BY (t.completed_at AT TIME ZONE 'Asia/Jakarta')::date;

CREATE VIEW v_product_sales AS
SELECT ti.product_id, ti.product_sku, ti.product_name,
       sum(ti.quantity) AS units_sold,
       sum(ti.subtotal) AS revenue,
       sum((ti.unit_price - ti.purchase_price) * ti.quantity) AS estimated_profit
FROM transaction_items ti
JOIN transactions t ON t.id = ti.transaction_id
WHERE t.status = 'completed'
GROUP BY ti.product_id, ti.product_sku, ti.product_name;

CREATE VIEW v_cashier_sales AS
SELECT p.id AS cashier_id, p.full_name AS cashier_name,
       count(t.id) FILTER (WHERE t.status = 'completed') AS transaction_count,
       COALESCE(sum(t.total_amount) FILTER (WHERE t.status = 'completed'), 0) AS revenue
FROM profiles p
LEFT JOIN transactions t ON t.cashier_id = p.id
GROUP BY p.id, p.full_name;
