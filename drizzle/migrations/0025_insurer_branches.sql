CREATE TABLE public.insurer_branches (
  insurer_id uuid NOT NULL REFERENCES public.insurers(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (insurer_id, branch_id)
);
GRANT SELECT, INSERT, DELETE ON public.insurer_branches TO authenticated;
GRANT ALL ON public.insurer_branches TO service_role;
ALTER TABLE public.insurer_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read" ON public.insurer_branches FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admin insert" ON public.insurer_branches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete" ON public.insurer_branches FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
INSERT INTO public.insurer_branches (insurer_id, branch_id) SELECT i.id, b.id FROM public.insurers i CROSS JOIN public.branches b ON CONFLICT DO NOTHING;