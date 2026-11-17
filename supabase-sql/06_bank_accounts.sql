-- Bank & cash accounts. Admin + manager only; staff have no access.
-- Admin can hide individual accounts from managers. Run after 05_manager_role.sql.
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  account_number      text,
  bank_name           text,
  hidden_from_manager boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  date       date NOT NULL DEFAULT current_date,
  direction  text NOT NULL CHECK (direction IN ('in', 'out')),
  amount     numeric(14,2) NOT NULL CHECK (amount > 0),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bank_tx_account ON public.bank_transactions(account_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all bank_accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Manager read bank_accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Manager insert bank_accounts" ON public.bank_accounts;
CREATE POLICY "Admin all bank_accounts" ON public.bank_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Manager read bank_accounts" ON public.bank_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role) AND NOT hidden_from_manager);
CREATE POLICY "Manager insert bank_accounts" ON public.bank_accounts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role) AND NOT hidden_from_manager);

DROP POLICY IF EXISTS "Admin all bank_transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Manager read bank_transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Manager insert bank_transactions" ON public.bank_transactions;
CREATE POLICY "Admin all bank_transactions" ON public.bank_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Manager read bank_transactions" ON public.bank_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role) AND EXISTS (
    SELECT 1 FROM public.bank_accounts a WHERE a.id = account_id AND NOT a.hidden_from_manager));
CREATE POLICY "Manager insert bank_transactions" ON public.bank_transactions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role) AND EXISTS (
    SELECT 1 FROM public.bank_accounts a WHERE a.id = account_id AND NOT a.hidden_from_manager));
