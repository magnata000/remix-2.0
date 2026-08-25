DROP INDEX IF EXISTS public.tasks_source_key_uniq;
CREATE UNIQUE INDEX tasks_source_key_uniq ON public.tasks (source_key);