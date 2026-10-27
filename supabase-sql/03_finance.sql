-- Accounts Receivable / Payable / Loans. Run AFTER 01 and 02 in the SQL Editor.
CREATE TABLE IF NOT EXISTS public.finance_parties (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       text NOT NULL CHECK (kind IN ('receivable', 'payable')),
  name       text NOT NULL,
  phone      text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id     uuid NOT NULL REFERENCES public.finance_parties(id) ON DELETE CASCADE,
  entry_type   text NOT NULL CHECK (entry_type IN ('invoice', 'loan', 'payment')),
  parent_id    uuid REFERENCES public.finance_entries(id) ON DELETE CASCADE,
  po_number    text,
  date         date NOT NULL DEFAULT current_date,
  product_name text,
  amount       numeric(14,2) NOT NULL DEFAULT 0,
  discount     numeric(14,2) NOT NULL DEFAULT 0,
  tax          numeric(14,2) NOT NULL DEFAULT 0,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_entries_party ON public.finance_entries(party_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_parties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated;
GRANT ALL ON public.finance_parties TO service_role;
GRANT ALL ON public.finance_entries TO service_role;

ALTER TABLE public.finance_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['finance_parties','finance_entries'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Auth read %1$s" ON public.%1$s;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth insert %1$s" ON public.%1$s;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth update %1$s" ON public.%1$s;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin delete %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "Auth read %1$s" ON public.%1$s FOR SELECT TO authenticated USING (true);', t);
    EXECUTE format('CREATE POLICY "Auth insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "Auth update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (true) WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "Admin delete %1$s" ON public.%1$s FOR DELETE TO authenticated USING (has_role(auth.uid(), ''admin''::app_role));', t);
  END LOOP;
END $$;
