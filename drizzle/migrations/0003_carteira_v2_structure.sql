-- ===== Catálogos: ramos e seguradoras =====
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{3,4}$'),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.insurers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.branches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.insurers TO authenticated;
GRANT ALL ON public.branches TO service_role;
GRANT ALL ON public.insurers TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read" ON public.branches FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team insert" ON public.branches FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Managers update" ON public.branches FOR UPDATE TO authenticated USING (public.can_view_all(auth.uid())) WITH CHECK (public.can_view_all(auth.uid()));
CREATE POLICY "Team read" ON public.insurers FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team insert" ON public.insurers FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Managers update" ON public.insurers FOR UPDATE TO authenticated USING (public.can_view_all(auth.uid())) WITH CHECK (public.can_view_all(auth.uid()));
CREATE TRIGGER branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER insurers_updated_at BEFORE UPDATE ON public.insurers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Código do ramo gerado a partir do nome; em colisão tenta sufixo numérico.
CREATE OR REPLACE FUNCTION public.branch_code_base(_name text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT rpad(left(regexp_replace(upper(translate(_name,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')), '[^A-Z0-9]', '', 'g'), 3), 3, 'X')
$$;
CREATE OR REPLACE FUNCTION public.trg_branch_code() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base text; cand text; n int := 1;
BEGIN
  IF NEW.code IS NOT NULL AND NEW.code <> '' THEN NEW.code := upper(NEW.code); RETURN NEW; END IF;
  base := public.branch_code_base(NEW.name); cand := base;
  WHILE EXISTS (SELECT 1 FROM public.branches WHERE code = cand) LOOP
    IF n > 9 THEN RAISE EXCEPTION 'Código de ramo em colisão; informe um código manualmente' USING ERRCODE = '23505'; END IF;
    cand := base || n::text; n := n + 1;
  END LOOP;
  NEW.code := cand; RETURN NEW;
END $$;
ALTER TABLE public.branches ALTER COLUMN code DROP NOT NULL;
CREATE TRIGGER branches_code BEFORE INSERT ON public.branches FOR EACH ROW EXECUTE FUNCTION public.trg_branch_code();
ALTER TABLE public.branches ALTER COLUMN code SET NOT NULL;

INSERT INTO public.branches (name) SELECT unnest(enum_range(NULL::public.branch))::text ORDER BY 1;
INSERT INTO public.insurers (name) SELECT unnest(enum_range(NULL::public.insurer))::text;

-- ===== Clientes =====
CREATE SEQUENCE public.clients_sequence_number_seq;
ALTER TABLE public.clients ADD COLUMN sequence_number integer;
ALTER TABLE public.clients ADD COLUMN is_active boolean NOT NULL DEFAULT true;
UPDATE public.clients c SET sequence_number = s.rn
  FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) rn FROM public.clients) s WHERE s.id = c.id;
SELECT setval('public.clients_sequence_number_seq', GREATEST((SELECT max(sequence_number) FROM public.clients), 0) + 1, false);
ALTER TABLE public.clients ALTER COLUMN sequence_number SET DEFAULT nextval('public.clients_sequence_number_seq');
ALTER SEQUENCE public.clients_sequence_number_seq OWNED BY public.clients.sequence_number;
ALTER TABLE public.clients ALTER COLUMN sequence_number SET NOT NULL;
CREATE UNIQUE INDEX clients_sequence_number_uniq ON public.clients(sequence_number);
GRANT USAGE ON SEQUENCE public.clients_sequence_number_seq TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.trg_client_seq_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.sequence_number := OLD.sequence_number; RETURN NEW; END $$;
CREATE TRIGGER clients_seq_immutable BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.trg_client_seq_immutable();

-- ===== Apólices =====
ALTER TABLE public.policies
  ADD COLUMN branch_id uuid REFERENCES public.branches(id),
  ADD COLUMN insurer_id uuid REFERENCES public.insurers(id),
  ADD COLUMN premio_total numeric,
  ADD COLUMN premio_liquido numeric,
  ADD COLUMN premium_periodicity public.premium_periodicity NOT NULL DEFAULT 'anual',
  ADD COLUMN root_policy_id uuid REFERENCES public.policies(id),
  ADD COLUMN renewal_sequence integer NOT NULL DEFAULT 0,
  ADD COLUMN contract_sequence integer;

UPDATE public.policies p SET branch_id = b.id FROM public.branches b WHERE b.name = p.branch::text;
UPDATE public.policies p SET insurer_id = i.id FROM public.insurers i WHERE i.name = p.insurer::text;
UPDATE public.policies SET premio_total = premium,
  premium_periodicity = CASE WHEN branch::text = 'Saúde' THEN 'mensal'::public.premium_periodicity ELSE 'anual' END;

WITH RECURSIVE chain AS (
  SELECT id, id AS root, 0 AS seq FROM public.policies WHERE renewed_from_id IS NULL
  UNION ALL
  SELECT p.id, c.root, c.seq + 1 FROM public.policies p JOIN chain c ON p.renewed_from_id = c.id
)
UPDATE public.policies p SET root_policy_id = c.root, renewal_sequence = c.seq FROM chain c WHERE c.id = p.id;
UPDATE public.policies SET root_policy_id = id WHERE root_policy_id IS NULL;

UPDATE public.policies p SET contract_sequence = s.rn FROM (
  SELECT id, dense_rank() OVER (PARTITION BY client_id, branch ORDER BY created_at, id) rn
  FROM public.policies WHERE renewal_sequence = 0) s WHERE s.id = p.id;
WITH RECURSIVE ch AS (
  SELECT id, contract_sequence cs FROM public.policies WHERE renewal_sequence = 0
  UNION ALL SELECT p.id, ch.cs FROM public.policies p JOIN ch ON p.renewed_from_id = ch.id
)
UPDATE public.policies p SET contract_sequence = ch.cs FROM ch WHERE ch.id = p.id AND p.contract_sequence IS NULL;

COMMENT ON COLUMN public.policies.premium IS 'DEPRECATED: replaced by premio_total';
COMMENT ON COLUMN public.policies.branch IS 'DEPRECATED: replaced by branch_id';
COMMENT ON COLUMN public.policies.insurer IS 'DEPRECATED: replaced by insurer_id';
CREATE INDEX policies_root_idx ON public.policies(root_policy_id);
CREATE INDEX policies_client_branch_idx ON public.policies(client_id, branch_id);

-- Número legível: RAMO-ANO-CLIENTE-CONTRATO-RENOVACAO
CREATE OR REPLACE FUNCTION public.trg_policy_before_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev public.policies; bcode text; cseq int;
BEGIN
  -- ponte de compatibilidade com colunas antigas
  IF NEW.branch_id IS NULL AND NEW.branch IS NOT NULL THEN SELECT id INTO NEW.branch_id FROM branches WHERE name = NEW.branch::text; END IF;
  IF NEW.insurer_id IS NULL AND NEW.insurer IS NOT NULL THEN SELECT id INTO NEW.insurer_id FROM insurers WHERE name = NEW.insurer::text; END IF;
  IF NEW.premio_total IS NULL THEN NEW.premio_total := NEW.premium; END IF;
  IF NEW.premium IS NULL THEN NEW.premium := NEW.premio_total; END IF;
  IF NEW.branch_id IS NULL THEN RAISE EXCEPTION 'Ramo obrigatório'; END IF;
  IF NEW.insurer_id IS NULL THEN RAISE EXCEPTION 'Seguradora obrigatória'; END IF;

  IF NEW.status IS NULL OR NEW.status = 'pendente' THEN NEW.status := 'ativa'; END IF;

  IF NEW.renewed_from_id IS NOT NULL THEN
    SELECT * INTO prev FROM policies WHERE id = NEW.renewed_from_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Apólice de origem não encontrada'; END IF;
    IF prev.status IN ('renovada','cancelada') THEN RAISE EXCEPTION 'Apólice de origem já está encerrada (%)', prev.status; END IF;
    NEW.root_policy_id := COALESCE(prev.root_policy_id, prev.id);
    NEW.renewal_sequence := prev.renewal_sequence + 1;
    NEW.client_id := prev.client_id;
    cseq := prev.contract_sequence;
  ELSE
    NEW.root_policy_id := NEW.id;
    NEW.renewal_sequence := 0;
    PERFORM pg_advisory_xact_lock(hashtext(NEW.client_id::text || NEW.branch_id::text));
    SELECT COALESCE(max(contract_sequence), 0) + 1 INTO cseq FROM policies
      WHERE client_id = NEW.client_id AND branch_id = NEW.branch_id;
  END IF;
  NEW.contract_sequence := cseq;

  SELECT code INTO bcode FROM branches WHERE id = NEW.branch_id;
  NEW.number := bcode || '-' || extract(year FROM NEW.start_date)::int || '-'
    || lpad((SELECT sequence_number FROM clients WHERE id = NEW.client_id)::text, 4, '0') || '-'
    || lpad(cseq::text, 2, '0') || '-' || lpad(NEW.renewal_sequence::text, 4, '0');
  RETURN NEW;
END $$;
CREATE TRIGGER policies_before_insert BEFORE INSERT ON public.policies FOR EACH ROW EXECUTE FUNCTION public.trg_policy_before_insert();

CREATE OR REPLACE FUNCTION public.trg_policy_number_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.number := OLD.number; NEW.root_policy_id := OLD.root_policy_id;
  NEW.renewal_sequence := OLD.renewal_sequence; NEW.contract_sequence := OLD.contract_sequence;
  NEW.renewed_from_id := OLD.renewed_from_id;
  IF NEW.branch_id IS DISTINCT FROM OLD.branch_id AND NEW.branch IS NOT DISTINCT FROM OLD.branch THEN NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER policies_identity_immutable BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.trg_policy_number_immutable();

-- ===== Acesso =====
CREATE OR REPLACE FUNCTION public.can_access_client(_user_id uuid, _client_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_view_all(_user_id)
    OR EXISTS (SELECT 1 FROM clients WHERE id = _client_id AND assignee_id = _user_id)
    OR EXISTS (SELECT 1 FROM policies WHERE client_id = _client_id AND assignee_id = _user_id)
    OR EXISTS (SELECT 1 FROM opportunities WHERE client_id = _client_id AND assignee_id = _user_id)
$$;
CREATE OR REPLACE FUNCTION public.can_access_policy(_user_id uuid, _policy_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_view_all(_user_id)
    OR EXISTS (SELECT 1 FROM policies WHERE id = _policy_id AND assignee_id = _user_id)
$$;
DROP POLICY "Carteira read" ON public.clients;
CREATE POLICY "Carteira read" ON public.clients FOR SELECT TO authenticated USING (public.can_access_client(auth.uid(), id));

-- ===== Timeline (append-only) =====
CREATE TABLE public.portfolio_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.timeline_entity NOT NULL,
  entity_id uuid NOT NULL,
  event_type public.timeline_event NOT NULL,
  description text NOT NULL,
  payload jsonb,
  related_entity_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portfolio_timeline TO authenticated;
GRANT ALL ON public.portfolio_timeline TO service_role;
ALTER TABLE public.portfolio_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read via entity" ON public.portfolio_timeline FOR SELECT TO authenticated USING (
  CASE entity_type WHEN 'client' THEN public.can_access_client(auth.uid(), entity_id)
                   ELSE public.can_access_policy(auth.uid(), entity_id) END);
CREATE INDEX portfolio_timeline_entity_idx ON public.portfolio_timeline(entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_policy_event(_policy public.policies, _event public.timeline_event,
  _description text, _payload jsonb DEFAULT NULL, _related uuid DEFAULT NULL) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO portfolio_timeline (entity_type, entity_id, event_type, description, payload, related_entity_id, created_by)
  VALUES ('policy', _policy.id, _event, _description, _payload, _related, auth.uid()),
         ('client', _policy.client_id, _event, _description, _payload, COALESCE(_related, _policy.id), auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.log_policy_event FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_policy_after_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev public.policies;
BEGIN
  IF NEW.renewed_from_id IS NOT NULL THEN
    UPDATE policies SET status = 'renovada', renewed_to_id = NEW.id WHERE id = NEW.renewed_from_id RETURNING * INTO prev;
    PERFORM log_policy_event(prev, 'apolice_renovada', 'Apólice ' || prev.number || ' renovada por ' || NEW.number, NULL, NEW.id);
    PERFORM log_policy_event(NEW, 'apolice_criada', 'Apólice ' || NEW.number || ' criada (renovação de ' || prev.number || ')', NULL, prev.id);
  ELSE
    PERFORM log_policy_event(NEW, 'apolice_criada', 'Apólice ' || NEW.number || ' criada');
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER policies_after_insert AFTER INSERT ON public.policies FOR EACH ROW EXECUTE FUNCTION public.trg_policy_after_insert();

CREATE OR REPLACE FUNCTION public.trg_policy_after_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'cancelada' THEN
      PERFORM log_policy_event(NEW, 'apolice_cancelada', 'Apólice ' || NEW.number || ' cancelada');
    ELSIF NEW.status = 'vencida' THEN
      PERFORM log_policy_event(NEW, 'apolice_vencida', 'Apólice ' || NEW.number || ' venceu');
    ELSIF NEW.status = 'nao_renovada' THEN
      PERFORM log_policy_event(NEW, 'apolice_nao_renovada', 'Apólice ' || NEW.number || ' não foi renovada — registre o motivo');
    END IF;
  ELSIF NEW.renewed_to_id IS NOT DISTINCT FROM OLD.renewed_to_id AND NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
    PERFORM log_policy_event(NEW, 'apolice_alterada', 'Apólice ' || NEW.number || ' alterada');
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER policies_after_update AFTER UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.trg_policy_after_update();

CREATE OR REPLACE FUNCTION public.trg_follow_up_timeline() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO portfolio_timeline (entity_type, entity_id, event_type, description, payload, related_entity_id, created_by)
  VALUES ('client', NEW.client_id, 'follow_up_registrado', 'Follow-up (' || NEW.type || ') agendado para ' || to_char(NEW.date, 'DD/MM/YYYY'),
          jsonb_build_object('type', NEW.type, 'date', NEW.date), NEW.id, auth.uid());
  RETURN NULL;
END $$;
CREATE TRIGGER follow_ups_timeline AFTER INSERT ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.trg_follow_up_timeline();

-- ===== Ações de negócio (RPC) =====
CREATE OR REPLACE FUNCTION public.register_policy_reason(_policy_id uuid, _motivo text, _categoria text, _observacoes text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.policies;
BEGIN
  IF NOT can_access_policy(auth.uid(), _policy_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _motivo NOT IN ('preco','relacionamento','concorrencia','experiencia','outro') THEN RAISE EXCEPTION 'Motivo inválido'; END IF;
  IF _motivo = 'outro' AND coalesce(trim(_categoria), '') = '' THEN RAISE EXCEPTION 'Informe a categoria'; END IF;
  SELECT * INTO p FROM policies WHERE id = _policy_id;
  IF p.status NOT IN ('cancelada','nao_renovada') THEN RAISE EXCEPTION 'Motivo só se aplica a apólices canceladas ou não renovadas'; END IF;
  PERFORM log_policy_event(p, 'motivo_registrado', 'Motivo registrado para ' || p.number,
    jsonb_build_object('motivo', _motivo, 'categoria_avulsa', nullif(trim(_categoria), ''), 'observacoes', coalesce(_observacoes, ''), 'status', p.status));
END $$;

CREATE OR REPLACE FUNCTION public.cancel_policy(_policy_id uuid, _motivo text, _categoria text, _observacoes text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_access_policy(auth.uid(), _policy_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE policies SET status = 'cancelada' WHERE id = _policy_id AND status NOT IN ('renovada','cancelada');
  IF NOT FOUND THEN RAISE EXCEPTION 'Apólice já encerrada'; END IF;
  PERFORM register_policy_reason(_policy_id, _motivo, _categoria, _observacoes);
END $$;

CREATE OR REPLACE FUNCTION public.remove_client(_client_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = _client_id AND (assignee_id = auth.uid() OR can_view_all(auth.uid()))) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  IF EXISTS (SELECT 1 FROM policies WHERE client_id = _client_id)
     OR EXISTS (SELECT 1 FROM follow_ups WHERE client_id = _client_id)
     OR EXISTS (SELECT 1 FROM opportunities WHERE client_id = _client_id)
     OR EXISTS (SELECT 1 FROM doc_files WHERE client_id = _client_id) THEN
    UPDATE clients SET is_active = false WHERE id = _client_id;
    INSERT INTO portfolio_timeline (entity_type, entity_id, event_type, description, created_by)
    VALUES ('client', _client_id, 'cliente_inativado', 'Cliente inativado', auth.uid());
    RETURN 'deactivated';
  END IF;
  DELETE FROM portfolio_timeline WHERE entity_type = 'client' AND entity_id = _client_id;
  DELETE FROM clients WHERE id = _client_id;
  RETURN 'deleted';
END $$;

CREATE OR REPLACE FUNCTION public.reactivate_client(_client_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = _client_id AND (assignee_id = auth.uid() OR can_view_all(auth.uid()))) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE clients SET is_active = true WHERE id = _client_id AND NOT is_active;
  IF FOUND THEN
    INSERT INTO portfolio_timeline (entity_type, entity_id, event_type, description, created_by)
    VALUES ('client', _client_id, 'cliente_reativado', 'Cliente reativado', auth.uid());
  END IF;
END $$;

-- Transições automáticas de status (executada pelo job diário)
CREATE OR REPLACE FUNCTION public.refresh_policy_statuses(_today date) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  WITH calc AS (
    SELECT id, CASE
      WHEN end_date IS NULL OR _today < end_date - 30 THEN 'ativa'
      WHEN _today <= end_date THEN 'a_vencer'
      WHEN _today <= end_date + 15 THEN 'vencida'
      ELSE 'nao_renovada' END::policy_status AS s
    FROM policies WHERE status IN ('ativa','a_vencer','vencida','nao_renovada','pendente')
  )
  UPDATE policies p SET status = calc.s FROM calc WHERE calc.id = p.id AND p.status IS DISTINCT FROM calc.s;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.refresh_policy_statuses FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_policy_statuses TO service_role;