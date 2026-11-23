CREATE TABLE public.task_comment_reactions (
  comment_id uuid NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.task_comment_reactions TO authenticated;
GRANT ALL ON public.task_comment_reactions TO service_role;
ALTER TABLE public.task_comment_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions read follow task" ON public.task_comment_reactions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.task_comments c JOIN public.tasks t ON t.id = c.task_id
  WHERE c.id = comment_id AND (t.assignee_id IS NULL OR t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));
CREATE POLICY "Own reactions insert" ON public.task_comment_reactions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.task_comments c JOIN public.tasks t ON t.id = c.task_id
  WHERE c.id = comment_id AND (t.assignee_id IS NULL OR t.assignee_id = auth.uid() OR public.can_view_all(auth.uid()))));
CREATE POLICY "Own reactions delete" ON public.task_comment_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());