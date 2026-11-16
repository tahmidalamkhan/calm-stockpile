DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','warehouses','products','suppliers','stock_levels','stock_movements'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Auth users can read %1$s" ON public.%1$s;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth users can insert %1$s" ON public.%1$s;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth users can update %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "Role holders can read %1$s" ON public.%1$s FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''staff''::app_role));', t);
    EXECUTE format('CREATE POLICY "Role holders can insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''staff''::app_role));', t);
    EXECUTE format('CREATE POLICY "Role holders can update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''staff''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''staff''::app_role));', t);
  END LOOP;
END $$;