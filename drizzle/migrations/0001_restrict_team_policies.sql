CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

DROP POLICY IF EXISTS "Staff read members" ON public.team_members;
CREATE POLICY "Staff read members" ON public.team_members FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "All read configs" ON public.commission_configs;
CREATE POLICY "All read configs" ON public.commission_configs FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));

DROP POLICY IF EXISTS "Team read columns" ON public.task_columns;
DROP POLICY IF EXISTS "Team insert columns" ON public.task_columns;
DROP POLICY IF EXISTS "Team update columns" ON public.task_columns;
DROP POLICY IF EXISTS "Team delete columns" ON public.task_columns;
CREATE POLICY "Team read columns" ON public.task_columns FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team insert columns" ON public.task_columns FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team update columns" ON public.task_columns FOR UPDATE TO authenticated
  USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team delete columns" ON public.task_columns FOR DELETE TO authenticated
  USING (public.is_team_member(auth.uid()));