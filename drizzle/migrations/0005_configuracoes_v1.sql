CREATE TYPE public.role_label AS ENUM ('admin','pos_venda','comercial');
CREATE TYPE public.user_status AS ENUM ('convidado','ativo','bloqueado');
CREATE TYPE public.page_key AS ENUM ('carteira','kanban_pipeline','kanban_tarefas','financeiro_comissoes','financeiro_despesas','financeiro_relatorios','configuracoes','dashboard');
CREATE TYPE public.access_request_status AS ENUM ('pendente','aprovado','recusado');
CREATE TYPE public.notification_type AS ENUM ('access_request','policy_not_renewed_pending_reason');
CREATE TYPE public.payment_model AS ENUM ('adiantamento','parcelado','parcela_vitalicio','parcelado_vitalicio');

ALTER TABLE public.team_members
  ADD COLUMN role_label public.role_label NOT NULL DEFAULT 'comercial',
  ADD COLUMN status public.user_status NOT NULL DEFAULT 'ativo',
  ADD COLUMN can_view_all_opportunities boolean NOT NULL DEFAULT false;
UPDATE public.team_members SET role_label = CASE role WHEN 'admin' THEN 'admin'::public.role_label WHEN 'pos_venda' THEN 'pos_venda'::public.role_label ELSE 'comercial'::public.role_label END;
COMMENT ON COLUMN public.team_members.role IS 'DEPRECATED: replaced by role_label (label only; access lives in user_permissions)';
CREATE UNIQUE INDEX IF NOT EXISTS team_members_email_uniq ON public.team_members (lower(email));

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles r JOIN public.team_members m ON m.id = r.user_id WHERE r.user_id = _user_id AND m.status <> 'bloqueado')
$$;

CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  page_key public.page_key NOT NULL,
  can_access boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, page_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin read" ON public.user_permissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write" ON public.user_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER user_permissions_updated_at BEFORE UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.user_permissions (user_id, page_key, can_access)
SELECT m.id, k.page, CASE
  WHEN m.role_label = 'admin' THEN true
  WHEN m.role_label = 'pos_venda' THEN k.page IN ('dashboard','carteira','kanban_pipeline','kanban_tarefas')
  ELSE k.page IN ('carteira','kanban_pipeline','kanban_tarefas') END
FROM public.team_members m CROSS JOIN unnest(enum_range(NULL::public.page_key)) AS k(page);

CREATE OR REPLACE FUNCTION public.has_page_access(_user_id uuid, _page public.page_key) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_team_member(_user_id) AND EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = _user_id AND page_key = _page AND can_access)
$$;

CREATE OR REPLACE FUNCTION public.can_view_all_opportunities(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_view_all(_user_id) OR EXISTS (SELECT 1 FROM public.team_members WHERE id = _user_id AND can_view_all_opportunities AND status = 'ativo')
$$;
DROP POLICY IF EXISTS "Board read" ON public.opportunities;
CREATE POLICY "Board read" ON public.opportunities FOR SELECT TO authenticated USING (assignee_id = auth.uid() OR public.can_view_all_opportunities(auth.uid()));

CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  justificativa text,
  status public.access_request_status NOT NULL DEFAULT 'pendente',
  resolved_by uuid REFERENCES public.team_members(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read" ON public.access_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER access_requests_updated_at BEFORE UPDATE ON public.access_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid REFERENCES public.team_members(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  is_actionable boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_related_idx ON public.notifications (related_entity_type, related_entity_id);
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipient read" ON public.notifications FOR SELECT TO authenticated USING (recipient_user_id = auth.uid() OR (recipient_user_id IS NULL AND public.has_role(auth.uid(),'admin')));
CREATE POLICY "Recipient mark read" ON public.notifications FOR UPDATE TO authenticated USING (recipient_user_id = auth.uid() OR (recipient_user_id IS NULL AND public.has_role(auth.uid(),'admin'))) WITH CHECK (recipient_user_id = auth.uid() OR (recipient_user_id IS NULL AND public.has_role(auth.uid(),'admin')));

CREATE OR REPLACE FUNCTION public.trg_access_request_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (recipient_user_id, type, title, body, related_entity_type, related_entity_id, is_actionable)
    VALUES (NULL, 'access_request', 'Nova solicitação de acesso', NEW.name || ' solicitou acesso ao sistema.', 'access_request', NEW.id, true);
  ELSIF NEW.status <> 'pendente' AND OLD.status = 'pendente' THEN
    UPDATE notifications SET resolved_at = now() WHERE related_entity_type = 'access_request' AND related_entity_id = NEW.id AND resolved_at IS NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER access_requests_notify AFTER INSERT OR UPDATE ON public.access_requests FOR EACH ROW EXECUTE FUNCTION public.trg_access_request_notify();

CREATE OR REPLACE FUNCTION public.trg_policy_not_renewed_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cname text;
BEGIN
  IF NEW.status = 'nao_renovada' AND OLD.status IS DISTINCT FROM 'nao_renovada' THEN
    SELECT name INTO cname FROM clients WHERE id = NEW.client_id;
    INSERT INTO notifications (recipient_user_id, type, title, body, related_entity_type, related_entity_id, is_actionable)
    VALUES (NEW.assignee_id, 'policy_not_renewed_pending_reason', 'Apólice ' || NEW.number || ' não foi renovada',
      'Registre o motivo para manter o histórico do cliente ' || coalesce(cname,'') || ' atualizado.', 'policy', NEW.id, true);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER policies_not_renewed_notify AFTER UPDATE OF status ON public.policies FOR EACH ROW EXECUTE FUNCTION public.trg_policy_not_renewed_notify();

CREATE OR REPLACE FUNCTION public.trg_reason_resolves_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.entity_type = 'policy' AND NEW.event_type = 'motivo_registrado' THEN
    UPDATE notifications SET resolved_at = now() WHERE type = 'policy_not_renewed_pending_reason' AND related_entity_id = NEW.entity_id AND resolved_at IS NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER portfolio_timeline_resolve_notification AFTER INSERT ON public.portfolio_timeline FOR EACH ROW EXECUTE FUNCTION public.trg_reason_resolves_notification();

INSERT INTO public.notifications (recipient_user_id, type, title, body, related_entity_type, related_entity_id, is_actionable)
SELECT p.assignee_id, 'policy_not_renewed_pending_reason', 'Apólice ' || p.number || ' não foi renovada',
  'Registre o motivo para manter o histórico do cliente ' || c.name || ' atualizado.', 'policy', p.id, true
FROM public.policies p JOIN public.clients c ON c.id = p.client_id
WHERE p.status = 'nao_renovada' AND NOT EXISTS (SELECT 1 FROM public.portfolio_timeline t WHERE t.entity_type='policy' AND t.entity_id=p.id AND t.event_type='motivo_registrado');

CREATE TABLE public.commission_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id uuid NOT NULL REFERENCES public.insurers(id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  modelo_pagamento public.payment_model NOT NULL,
  percentual_padrao numeric NOT NULL CHECK (percentual_padrao >= 0 AND percentual_padrao <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (insurer_id, branch_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_config TO authenticated;
GRANT ALL ON public.commission_config TO service_role;
ALTER TABLE public.commission_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read" ON public.commission_config FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "Admin write" ON public.commission_config FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER commission_config_updated_at BEFORE UPDATE ON public.commission_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
COMMENT ON TABLE public.commission_configs IS 'DEPRECATED: replaced by commission_config (insurer_id + branch_id)';

DROP POLICY IF EXISTS "Managers update" ON public.branches;
DROP POLICY IF EXISTS "Managers update" ON public.insurers;
CREATE POLICY "Admin update" ON public.branches FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update" ON public.insurers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));