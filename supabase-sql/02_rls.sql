-- ============================================================
-- Inventory App — Row Level Security + grants
-- Run AFTER 01_schema.sql.
-- Authenticated users can read/insert/update; only admins delete.
-- ============================================================

-- ---------- Grants (Supabase Data API needs these) ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouses      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_levels    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_requests TO authenticated;

GRANT ALL ON public.companies        TO service_role;
GRANT ALL ON public.warehouses       TO service_role;
GRANT ALL ON public.products         TO service_role;
GRANT ALL ON public.suppliers        TO service_role;
GRANT ALL ON public.stock_levels     TO service_role;
GRANT ALL ON public.stock_movements  TO service_role;
GRANT ALL ON public.user_roles       TO service_role;
GRANT ALL ON public.account_requests TO service_role;

-- ---------- Enable RLS ----------
ALTER TABLE public.companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_levels     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_requests ENABLE ROW LEVEL SECURITY;

-- ---------- Policies: shared inventory tables ----------
-- Same pattern for companies, warehouses, products, suppliers,
-- stock_levels, stock_movements: auth users read/write, admins delete.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','warehouses','products','suppliers','stock_levels','stock_movements'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Auth users can read %1$s"   ON public.%1$s;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth users can insert %1$s" ON public.%1$s;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth users can update %1$s" ON public.%1$s;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Only admins can delete %1$s" ON public.%1$s;', t);

    EXECUTE format('CREATE POLICY "Auth users can read %1$s"   ON public.%1$s FOR SELECT TO authenticated USING (true);', t);
    EXECUTE format('CREATE POLICY "Auth users can insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "Auth users can update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (true) WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "Only admins can delete %1$s" ON public.%1$s FOR DELETE TO authenticated USING (has_role(auth.uid(), ''admin''::app_role));', t);
  END LOOP;
END $$;

-- ---------- Policies: user_roles ----------
DROP POLICY IF EXISTS "Users read own roles"   ON public.user_roles;
DROP POLICY IF EXISTS "Admins read all roles"  ON public.user_roles;
DROP POLICY IF EXISTS "Admins insert roles"    ON public.user_roles;
DROP POLICY IF EXISTS "Admins delete roles"    ON public.user_roles;

CREATE POLICY "Users read own roles"  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert roles"   ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete roles"   ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ---------- Policies: account_requests ----------
DROP POLICY IF EXISTS "Users read own request"     ON public.account_requests;
DROP POLICY IF EXISTS "Users create own request"   ON public.account_requests;
DROP POLICY IF EXISTS "Admins read all requests"   ON public.account_requests;
DROP POLICY IF EXISTS "Admins update requests"     ON public.account_requests;

CREATE POLICY "Users read own request"   ON public.account_requests FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "Users create own request" ON public.account_requests FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "Admins read all requests" ON public.account_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update requests"   ON public.account_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
