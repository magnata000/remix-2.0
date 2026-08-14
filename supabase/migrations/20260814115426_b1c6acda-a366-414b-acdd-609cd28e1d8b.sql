-- Storage policies for client documents bucket
CREATE POLICY "Client documents read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents');
CREATE POLICY "Client documents insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents');
CREATE POLICY "Client documents update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'client-documents');
CREATE POLICY "Client documents delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-documents');

-- Helper: create folder if a sibling with the same name does not exist
CREATE OR REPLACE FUNCTION public.upsert_doc_folder(
  _name text,
  _parent_id uuid,
  _policy_id uuid,
  _client_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  SELECT id INTO _id FROM public.doc_folders
   WHERE client_id = _client_id
     AND name = _name
     AND parent_id IS NOT DISTINCT FROM _parent_id
     AND policy_id IS NOT DISTINCT FROM _policy_id
   LIMIT 1;
  IF _id IS NOT NULL THEN RETURN _id; END IF;

  INSERT INTO public.doc_folders (name, parent_id, policy_id, client_id, is_client_root)
  VALUES (_name, _parent_id, _policy_id, _client_id, false)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_client_root(_client_id uuid) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  SELECT id INTO _id FROM public.doc_folders
   WHERE client_id = _client_id AND is_client_root = true LIMIT 1;
  IF _id IS NOT NULL THEN RETURN _id; END IF;

  INSERT INTO public.doc_folders (name, parent_id, policy_id, client_id, is_client_root)
  VALUES ('Geral do Cliente', NULL, NULL, _client_id, true)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_policy_folders(_policy_id uuid) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  product text;
  root_id uuid;
  parent uuid;
  year_id uuid;
  y text;
  child text;
BEGIN
  SELECT id, number, client_id, branch::text AS branch, start_date
    INTO p FROM public.policies WHERE id = _policy_id;
  IF p.id IS NULL THEN RETURN; END IF;

  PERFORM public.ensure_client_root(p.client_id);

  product := CASE p.branch
    WHEN 'Saúde' THEN 'Saúde'
    WHEN 'Consórcio' THEN 'Consórcio'
    ELSE 'Seguros' END;

  SELECT id INTO root_id FROM public.doc_folders
   WHERE policy_id = _policy_id AND parent_id IS NULL LIMIT 1;
  IF root_id IS NULL THEN
    INSERT INTO public.doc_folders (name, parent_id, policy_id, client_id, is_client_root)
    VALUES (product || ' · Apólice ' || p.number || ' — ' || p.branch, NULL, _policy_id, p.client_id, false)
    RETURNING id INTO root_id;
  END IF;

  IF product = 'Saúde' THEN
    parent := public.upsert_doc_folder('Documentação Preliminar', root_id, _policy_id, p.client_id);
    FOREACH child IN ARRAY ARRAY['Empresa','Titular','Beneficiários','Cartas de Permanência e Carteirinhas','Documentação Complementar','Informações Pessoais'] LOOP
      PERFORM public.upsert_doc_folder(child, parent, _policy_id, p.client_id);
    END LOOP;
    parent := public.upsert_doc_folder('Pós-venda', root_id, _policy_id, p.client_id);
    FOREACH child IN ARRAY ARRAY['Acesso','Cotações','Proposta Contratada','Demonstrativos','Outros'] LOOP
      PERFORM public.upsert_doc_folder(child, parent, _policy_id, p.client_id);
    END LOOP;
  ELSIF product = 'Consórcio' THEN
    PERFORM public.upsert_doc_folder('Geral', root_id, _policy_id, p.client_id);
  ELSE
    y := to_char(COALESCE(p.start_date, CURRENT_DATE), 'YYYY');
    year_id := public.upsert_doc_folder(y, root_id, _policy_id, p.client_id);
    FOREACH child IN ARRAY ARRAY['Boletos','Cotações','Endossos','Proposta Contratada'] LOOP
      PERFORM public.upsert_doc_folder(child, year_id, _policy_id, p.client_id);
    END LOOP;
  END IF;
END;
$$;

-- Triggers
CREATE OR REPLACE FUNCTION public.trg_client_docs() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_client_root(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_policy_docs() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_policy_folders(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_doc_root ON public.clients;
CREATE TRIGGER trg_clients_doc_root AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.trg_client_docs();

DROP TRIGGER IF EXISTS trg_policies_doc_folders ON public.policies;
CREATE TRIGGER trg_policies_doc_folders AFTER INSERT ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.trg_policy_docs();

-- Backfill existing data
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.clients LOOP
    PERFORM public.ensure_client_root(r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.policies LOOP
    PERFORM public.ensure_policy_folders(r.id);
  END LOOP;
END;
$$;