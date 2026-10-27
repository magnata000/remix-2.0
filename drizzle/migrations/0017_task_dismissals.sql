CREATE TABLE public.task_dismissals (
  source_key text PRIMARY KEY,
  dismissed_by uuid,
  dismissed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.task_dismissals TO authenticated;
GRANT ALL ON public.task_dismissals TO service_role;
ALTER TABLE public.task_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read dismissals" ON public.task_dismissals FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team insert dismissals" ON public.task_dismissals FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member(auth.uid()));

CREATE OR REPLACE FUNCTION public.trg_task_dismiss_on_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.source_key IS NOT NULL THEN
    INSERT INTO public.task_dismissals (source_key, dismissed_by)
    VALUES (OLD.source_key, auth.uid())
    ON CONFLICT (source_key) DO NOTHING;
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER trg_tasks_dismiss_on_delete AFTER DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.trg_task_dismiss_on_delete();