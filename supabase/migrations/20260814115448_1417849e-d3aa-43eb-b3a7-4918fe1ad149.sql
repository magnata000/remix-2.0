REVOKE EXECUTE ON FUNCTION public.upsert_doc_folder(text, uuid, uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_client_root(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_policy_folders(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_client_docs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_policy_docs() FROM anon, authenticated;