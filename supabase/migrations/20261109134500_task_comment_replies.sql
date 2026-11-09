ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.task_comments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_task_comments_reply_to ON public.task_comments(reply_to_id);
