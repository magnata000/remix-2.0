CREATE OR REPLACE FUNCTION public.ensure_policy_folders(_policy_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p record; product text; bname text; root_id uuid; parent uuid; year_id uuid; y text; child text;
BEGIN
  SELECT pol.id, pol.number, pol.client_id, pol.start_date,
         COALESCE(b.name, pol.branch::text, 'Seguro') AS branch
    INTO p FROM public.policies pol
    LEFT JOIN public.branches b ON b.id = pol.branch_id
   WHERE pol.id = _policy_id;
  IF p.id IS NULL THEN RETURN; END IF;
  bname := p.branch;

  PERFORM public.ensure_client_root(p.client_id);

  -- Saúde e Consórcio têm estrutura própria; todos os demais ramos (atuais e futuros) seguem o modelo do Auto.
  product := CASE bname WHEN 'Saúde' THEN 'Saúde' WHEN 'Consórcio' THEN 'Consórcio' ELSE 'Seguros' END;

  SELECT id INTO root_id FROM public.doc_folders
   WHERE policy_id = _policy_id AND parent_id IS NULL LIMIT 1;
  IF root_id IS NULL THEN
    INSERT INTO public.doc_folders (name, parent_id, policy_id, client_id, is_client_root)
    VALUES (product || ' · Apólice ' || COALESCE(p.number, '') || ' — ' || bname, NULL, _policy_id, p.client_id, false)
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
REVOKE EXECUTE ON FUNCTION public.ensure_policy_folders(uuid) FROM anon, authenticated;