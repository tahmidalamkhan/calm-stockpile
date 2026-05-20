-- ============ ENUMS (idempotent) ============
do $$
begin
  if not exists (select 1 from pg_type where typname = 'stock_movement_type') then
    create type public.stock_movement_type as enum ('purchase','sale','adjustment','transfer');
  end if;
end $$;

-- ============ TIMESTAMP HELPER ============
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ============ COMPANIES ============
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text not null,
  currency text not null default 'USD',
  tax_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.companies enable row level security;
drop trigger if exists trg_companies_touch on public.companies;
create trigger trg_companies_touch before update on public.companies
  for each row execute function public.touch_updated_at();

-- ============ WAREHOUSES ============
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text not null,
  address text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);
alter table public.warehouses enable row level security;
drop trigger if exists trg_warehouses_touch on public.warehouses;
create trigger trg_warehouses_touch before update on public.warehouses
  for each row execute function public.touch_updated_at();

-- ============ PRODUCTS ============
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sku text not null,
  name text not null,
  category text,
  unit text not null default 'pcs',
  avg_cost numeric(14,2) not null default 0,
  price numeric(14,2) not null default 0,
  reorder_level numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, sku)
);
alter table public.products enable row level security;
drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ============ SUPPLIERS ============
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.suppliers enable row level security;
drop trigger if exists trg_suppliers_touch on public.suppliers;
create trigger trg_suppliers_touch before update on public.suppliers
  for each row execute function public.touch_updated_at();

-- ============ STOCK LEVELS ============
create table if not exists public.stock_levels (
  product_id uuid not null references public.products(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  quantity numeric(14,2) not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, warehouse_id)
);
alter table public.stock_levels enable row level security;
drop trigger if exists trg_stock_levels_touch on public.stock_levels;
create trigger trg_stock_levels_touch before update on public.stock_levels
  for each row execute function public.touch_updated_at();

-- ============ STOCK MOVEMENTS ============
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  date timestamptz not null default now(),
  product_id uuid not null references public.products(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  type stock_movement_type not null,
  quantity numeric(14,2) not null,
  unit_cost numeric(14,2) not null default 0,
  reference text,
  from_qty numeric(14,2),
  to_qty numeric(14,2),
  created_at timestamptz not null default now()
);
alter table public.stock_movements enable row level security;

create index if not exists idx_movements_company_date on public.stock_movements(company_id, date desc);
create index if not exists idx_movements_product on public.stock_movements(product_id);
create index if not exists idx_movements_warehouse on public.stock_movements(warehouse_id);

-- ============ RLS POLICIES ============
-- Ensure has_role function exists
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

do $$
declare t text;
begin
  foreach t in array array['companies','warehouses','products','suppliers','stock_levels','stock_movements']
  loop
    execute format($f$
      drop policy if exists "Auth users can read %1$s" on public.%1$s;
      create policy "Auth users can read %1$s" on public.%1$s for select to authenticated using (true);

      drop policy if exists "Auth users can insert %1$s" on public.%1$s;
      create policy "Auth users can insert %1$s" on public.%1$s for insert to authenticated with check (true);

      drop policy if exists "Auth users can update %1$s" on public.%1$s;
      create policy "Auth users can update %1$s" on public.%1$s for update to authenticated using (true) with check (true);

      drop policy if exists "Only admins can delete %1$s" on public.%1$s;
      create policy "Only admins can delete %1$s" on public.%1$s for delete to authenticated using (public.has_role(auth.uid(),'admin'));
    $f$, t);
  end loop;
end $$;