ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS stage_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_hours integer,
  ADD COLUMN IF NOT EXISTS sla_paused_at timestamptz;

CREATE TABLE IF NOT EXISTS public.opportunity_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  edited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_comments TO authenticated;
GRANT ALL ON public.opportunity_comments TO service_role;
ALTER TABLE public.opportunity_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments follow opportunity" ON public.opportunity_comments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id
  AND (o.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id
  AND (o.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));
CREATE TRIGGER trg_opportunity_comments_updated BEFORE UPDATE ON public.opportunity_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.opportunity_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.opportunity_comments(id) ON DELETE CASCADE,
  name text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  mime text NOT NULL DEFAULT 'file',
  storage_path text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_attachments TO authenticated;
GRANT ALL ON public.opportunity_attachments TO service_role;
ALTER TABLE public.opportunity_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attachments follow opportunity" ON public.opportunity_attachments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id
  AND (o.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id
  AND (o.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));

CREATE TABLE IF NOT EXISTS public.opportunity_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  kind text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL,
  from_label text,
  to_label text,
  comment_id uuid REFERENCES public.opportunity_comments(id) ON DELETE CASCADE,
  attachment_id uuid REFERENCES public.opportunity_attachments(id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_timeline TO authenticated;
GRANT ALL ON public.opportunity_timeline TO service_role;
ALTER TABLE public.opportunity_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Timeline follows opportunity" ON public.opportunity_timeline FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id
  AND (o.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id
  AND (o.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));

CREATE INDEX IF NOT EXISTS idx_opp_comments_opp ON public.opportunity_comments(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_atts_opp ON public.opportunity_attachments(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_timeline_opp ON public.opportunity_timeline(opportunity_id);

CREATE POLICY "Opportunity attachments access" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'opportunity-attachments' AND EXISTS (
  SELECT 1 FROM public.opportunities o
  WHERE o.id::text = (storage.foldername(name))[1]
    AND (o.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (bucket_id = 'opportunity-attachments' AND EXISTS (
  SELECT 1 FROM public.opportunities o
  WHERE o.id::text = (storage.foldername(name))[1]
    AND (o.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));

DROP POLICY IF EXISTS "Attachments follow task" ON public.task_attachments;
CREATE POLICY "Attachments follow task" ON public.task_attachments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id
  AND (t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id
  AND (t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));

DROP POLICY IF EXISTS "Comments follow task" ON public.task_comments;
CREATE POLICY "Comments follow task" ON public.task_comments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id
  AND (t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id
  AND (t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));

DROP POLICY IF EXISTS "Timeline follows task" ON public.task_timeline;
CREATE POLICY "Timeline follows task" ON public.task_timeline FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id
  AND (t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id
  AND (t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));

DROP POLICY IF EXISTS "Task attachments read" ON storage.objects;
DROP POLICY IF EXISTS "Task attachments insert" ON storage.objects;
DROP POLICY IF EXISTS "Task attachments update" ON storage.objects;
DROP POLICY IF EXISTS "Task attachments delete" ON storage.objects;
CREATE POLICY "Task attachments access" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'task-attachments' AND EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id::text = (storage.foldername(name))[1]
    AND (t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (bucket_id = 'task-attachments' AND EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id::text = (storage.foldername(name))[1]
    AND (t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));

DROP POLICY IF EXISTS "Client documents read" ON storage.objects;
DROP POLICY IF EXISTS "Client documents insert" ON storage.objects;
DROP POLICY IF EXISTS "Client documents update" ON storage.objects;
DROP POLICY IF EXISTS "Client documents delete" ON storage.objects;
CREATE POLICY "Client documents access" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'client-documents' AND EXISTS (
  SELECT 1 FROM public.clients c
  WHERE c.id::text = (storage.foldername(name))[1]
    AND (c.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (bucket_id = 'client-documents' AND EXISTS (
  SELECT 1 FROM public.clients c
  WHERE c.id::text = (storage.foldername(name))[1]
    AND (c.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));