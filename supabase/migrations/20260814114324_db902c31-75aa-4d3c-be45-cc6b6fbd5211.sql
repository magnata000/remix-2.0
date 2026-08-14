-- 1. Prioridade
DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('alta','media','baixa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.scheduled_kind AS ENUM ('data','semana','recorrente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Colunas do quadro
CREATE TABLE public.task_columns (
  id text PRIMARY KEY,
  title text NOT NULL,
  color text NOT NULL DEFAULT '#64748B',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_columns TO authenticated;
GRANT ALL ON public.task_columns TO service_role;
ALTER TABLE public.task_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read columns" ON public.task_columns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team insert columns" ON public.task_columns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team update columns" ON public.task_columns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Team delete columns" ON public.task_columns FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_task_columns_updated BEFORE UPDATE ON public.task_columns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.task_columns (id, title, color, order_index) VALUES
  ('c-demanda', 'Demanda', '#64748B', 0),
  ('c-processando', 'Processando', '#D97706', 1),
  ('c-concluido', 'Concluído', '#059669', 2);

-- 3. Tarefas: novas colunas
ALTER TABLE public.tasks
  ADD COLUMN priority public.task_priority NOT NULL DEFAULT 'media',
  ADD COLUMN client_name text,
  ADD COLUMN source_key text,
  ADD COLUMN sla_due_at timestamptz,
  ADD COLUMN sla_hours integer,
  ADD COLUMN sla_paused_at timestamptz;
CREATE UNIQUE INDEX tasks_source_key_uniq ON public.tasks (source_key) WHERE source_key IS NOT NULL;

-- 4. Comentários
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  edited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments follow task" ON public.task_comments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));
CREATE TRIGGER trg_task_comments_updated BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX task_comments_task_idx ON public.task_comments (task_id);

-- 5. Anexos
CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.task_comments(id) ON DELETE CASCADE,
  name text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  mime text NOT NULL DEFAULT 'file',
  storage_path text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attachments TO authenticated;
GRANT ALL ON public.task_attachments TO service_role;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attachments follow task" ON public.task_attachments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));
CREATE INDEX task_attachments_task_idx ON public.task_attachments (task_id);

-- 6. Histórico
CREATE TABLE public.task_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  kind text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL,
  from_label text,
  to_label text,
  comment_id uuid,
  attachment_id uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_timeline TO authenticated;
GRANT ALL ON public.task_timeline TO service_role;
ALTER TABLE public.task_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Timeline follows task" ON public.task_timeline FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));
CREATE INDEX task_timeline_task_idx ON public.task_timeline (task_id);

-- 7. Tarefas agendadas
CREATE TABLE public.scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assignee_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  priority public.task_priority NOT NULL DEFAULT 'media',
  kind public.scheduled_kind NOT NULL DEFAULT 'data',
  start_date date,
  end_date date,
  weekdays smallint[],
  period text,
  recurrence jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_tasks TO authenticated;
GRANT ALL ON public.scheduled_tasks TO service_role;
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scheduled read" ON public.scheduled_tasks FOR SELECT TO authenticated
  USING (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE POLICY "Scheduled insert" ON public.scheduled_tasks FOR INSERT TO authenticated
  WITH CHECK (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE POLICY "Scheduled update" ON public.scheduled_tasks FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid() OR public.can_view_all(auth.uid()))
  WITH CHECK (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE POLICY "Scheduled delete" ON public.scheduled_tasks FOR DELETE TO authenticated
  USING (assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE TRIGGER trg_scheduled_tasks_updated BEFORE UPDATE ON public.scheduled_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();