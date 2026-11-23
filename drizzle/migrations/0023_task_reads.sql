CREATE TABLE public.task_reads (
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, task_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_reads TO authenticated;
GRANT ALL ON public.task_reads TO service_role;
ALTER TABLE public.task_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own task reads" ON public.task_reads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());