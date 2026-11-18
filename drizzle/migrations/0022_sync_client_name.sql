CREATE OR REPLACE FUNCTION public.trg_client_name_sync() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.commissions c SET client_name = NEW.name
     WHERE c.client_id = NEW.id
        OR c.policy_id IN (SELECT id FROM public.policies WHERE client_id = NEW.id);
    UPDATE public.opportunities SET client_name = NEW.name WHERE client_id = NEW.id;
    UPDATE public.tasks SET client_name = NEW.name WHERE client_name = OLD.name;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.trg_client_name_sync() FROM anon, authenticated;
DROP TRIGGER IF EXISTS trg_clients_name_sync ON public.clients;
CREATE TRIGGER trg_clients_name_sync AFTER UPDATE OF name ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.trg_client_name_sync();