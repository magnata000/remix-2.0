CREATE POLICY "Despesas por permissão de página" ON public.expenses FOR ALL TO authenticated
USING (public.has_page_access(auth.uid(), 'financeiro_despesas'::page_key))
WITH CHECK (public.has_page_access(auth.uid(), 'financeiro_despesas'::page_key));
GRANT SELECT, INSERT, UPDATE ON public.expenses TO authenticated;