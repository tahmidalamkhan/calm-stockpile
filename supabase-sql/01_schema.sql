-- ============================================================
-- Inventory App — full Supabase schema
-- Run this in the Supabase SQL Editor (or psql) on an empty project.
-- Order matters: enums -> functions -> tables -> triggers -> RLS.
-- ============================================================

-- ---------- Enums ----------
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- updated_at helper ----------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- Role check helper (security definer so RLS can call it) ----------
CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ---------- Companies ----------
CREATE TABLE IF NOT EXISTS companies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  legal_name text NOT NULL,
  currency   text NOT NULL DEFAULT 'USD',
  tax_id     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Warehouses ----------
CREATE TABLE IF NOT EXISTS warehouses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       text NOT NULL,
  code       text NOT NULL,
  address    text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

-- ---------- Products ----------
CREATE TABLE IF NOT EXISTS products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku           text NOT NULL,
  name          text NOT NULL,
  category      text,
  unit          text NOT NULL DEFAULT 'pcs',
  avg_cost      numeric(14,2) NOT NULL DEFAULT 0,
  price         numeric(14,2) NOT NULL DEFAULT 0,
  reorder_level numeric(14,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, sku)
);

-- ---------- Suppliers (kept for compatibility; unused in the UI) ----------
CREATE TABLE IF NOT EXISTS suppliers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       text NOT NULL,
  email      text,
  phone      text,
  address    text,
  balance    numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Stock levels (never negative) ----------
CREATE TABLE IF NOT EXISTS stock_levels (
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity     numeric(14,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, warehouse_id)
);

-- ---------- Stock movements (immutable history with before/after snapshots) ----------
CREATE TABLE IF NOT EXISTS stock_movements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date         timestamptz NOT NULL DEFAULT now(),
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  type         stock_movement_type NOT NULL,
  quantity     numeric(14,2) NOT NULL,
  unit_cost    numeric(14,2) NOT NULL DEFAULT 0,
  reference    text,
  from_qty     numeric(14,2),
  to_qty       numeric(14,2),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movements_company_date ON stock_movements(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_movements_product      ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_warehouse    ON stock_movements(warehouse_id);

-- ---------- User roles (references Supabase Auth users) ----------
CREATE TABLE IF NOT EXISTS user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ---------- Account approval requests ----------
CREATE TABLE IF NOT EXISTS account_requests (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_role app_role,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------- updated_at triggers ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','warehouses','products','suppliers','stock_levels','account_requests'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_touch ON %1$s;', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_touch BEFORE UPDATE ON %1$s
                    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();', t);
  END LOOP;
END $$;
