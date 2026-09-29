ALTER TABLE public.policies DROP CONSTRAINT policies_client_id_fkey;
ALTER TABLE public.policies ADD CONSTRAINT policies_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.doc_files DROP CONSTRAINT doc_files_policy_id_fkey;
ALTER TABLE public.doc_files ADD CONSTRAINT doc_files_policy_id_fkey
  FOREIGN KEY (policy_id) REFERENCES public.policies(id) ON DELETE CASCADE;

ALTER TABLE public.opportunities DROP CONSTRAINT opportunities_client_id_fkey;
ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;