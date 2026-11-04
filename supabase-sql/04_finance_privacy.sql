-- Run after 03_finance.sql on the external database used by the app.
-- Recipient privacy uses the existing notes column, with no new table or column.
CREATE OR REPLACE FUNCTION public.finance_party_hidden_from_staff(value text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE payload jsonb;
BEGIN
  IF value IS NULL OR left(value, length('stockhub-finance-privacy-v1:')) <> 'stockhub-finance-privacy-v1:' THEN
    RETURN false;
  END IF;
  BEGIN
    payload := substring(value FROM length('stockhub-finance-privacy-v1:') + 1)::jsonb;
    RETURN (payload->'hiddenFromStaff') IS DISTINCT FROM 'false'::jsonb;
  EXCEPTION WHEN OTHERS THEN RETURN true;
  END;
END $$;

-- Restrictive policies also constrain any pre-existing permissive policies.
DROP POLICY IF EXISTS "Finance recipient privacy" ON public.finance_parties;
CREATE POLICY "Finance recipient privacy" ON public.finance_parties AS RESTRICTIVE
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR NOT public.finance_party_hidden_from_staff(notes))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR NOT public.finance_party_hidden_from_staff(notes));

DROP POLICY IF EXISTS "Finance entry recipient privacy" ON public.finance_entries;
CREATE POLICY "Finance entry recipient privacy" ON public.finance_entries AS RESTRICTIVE
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.finance_parties p WHERE p.id = party_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.finance_parties p WHERE p.id = party_id));

CREATE OR REPLACE FUNCTION public.set_finance_party_visibility(party uuid, hidden boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE previous text; plain_notes text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  SELECT notes INTO previous FROM public.finance_parties WHERE id = party FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recipient not found'; END IF;
  plain_notes := previous;
  IF left(previous, length('stockhub-finance-privacy-v1:')) = 'stockhub-finance-privacy-v1:' THEN
    BEGIN plain_notes := (substring(previous FROM length('stockhub-finance-privacy-v1:') + 1)::jsonb)->>'notes';
    EXCEPTION WHEN OTHERS THEN plain_notes := NULL; END;
  END IF;
  UPDATE public.finance_parties SET notes = 'stockhub-finance-privacy-v1:' ||
    jsonb_build_object('hiddenFromStaff', hidden, 'notes', plain_notes)::text WHERE id = party;
END $$;
REVOKE ALL ON FUNCTION public.set_finance_party_visibility(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_finance_party_visibility(uuid, boolean) TO authenticated, service_role;

-- Created last: the UI enables privacy controls only when this RPC exists.
CREATE OR REPLACE FUNCTION public.finance_privacy_ready()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT true $$;
REVOKE ALL ON FUNCTION public.finance_privacy_ready() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finance_privacy_ready() TO authenticated, service_role;