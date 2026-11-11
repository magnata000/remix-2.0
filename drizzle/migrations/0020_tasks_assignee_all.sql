ALTER TABLE public.tasks ALTER COLUMN assignee_id DROP NOT NULL;
COMMENT ON COLUMN public.tasks.assignee_id IS 'NULL = tarefa atribuída a todos os colaboradores';
DROP POLICY IF EXISTS "Board read" ON public.tasks;
DROP POLICY IF EXISTS "Own insert" ON public.tasks;
DROP POLICY IF EXISTS "Own update" ON public.tasks;
DROP POLICY IF EXISTS "Own delete" ON public.tasks;
CREATE POLICY "Board read" ON public.tasks FOR SELECT TO authenticated
  USING (assignee_id IS NULL OR assignee_id = auth.uid() OR public.can_view_all(auth.uid()));
CREATE POLICY "Own insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own update" ON public.tasks FOR UPDATE TO authenticated
  USING (assignee_id IS NULL OR assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (assignee_id IS NULL OR assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own delete" ON public.tasks FOR DELETE TO authenticated
  USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Comments follow task" ON public.task_comments;
CREATE POLICY "Comments follow task" ON public.task_comments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id
  AND (t.assignee_id IS NULL OR t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id
  AND (t.assignee_id IS NULL OR t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));
DROP POLICY IF EXISTS "Attachments follow task" ON public.task_attachments;
CREATE POLICY "Attachments follow task" ON public.task_attachments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id
  AND (t.assignee_id IS NULL OR t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id
  AND (t.assignee_id IS NULL OR t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));
DROP POLICY IF EXISTS "Timeline follows task" ON public.task_timeline;
CREATE POLICY "Timeline follows task" ON public.task_timeline FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id
  AND (t.assignee_id IS NULL OR t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id
  AND (t.assignee_id IS NULL OR t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));
DROP POLICY IF EXISTS "Task attachments access" ON storage.objects;
CREATE POLICY "Task attachments access" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'task-attachments' AND EXISTS (
  SELECT 1 FROM public.tasks t WHERE t.id::text = (storage.foldername(name))[1]
    AND (t.assignee_id IS NULL OR t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))))
WITH CHECK (bucket_id = 'task-attachments' AND EXISTS (
  SELECT 1 FROM public.tasks t WHERE t.id::text = (storage.foldername(name))[1]
    AND (t.assignee_id IS NULL OR t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));