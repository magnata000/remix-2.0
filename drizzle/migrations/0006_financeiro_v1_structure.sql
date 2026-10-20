-- Enums
ALTER TYPE public.commission_status ADD VALUE IF NOT EXISTS 'conciliada';
ALTER TYPE public.commission_status ADD VALUE IF NOT EXISTS 'parcial';
ALTER TYPE public.commission_status ADD VALUE IF NOT EXISTS 'divergente';
ALTER TYPE public.commission_status ADD VALUE IF NOT EXISTS 'estornada';
ALTER TYPE public.commission_status ADD VALUE IF NOT EXISTS 'ajustada';
CREATE TYPE public.commission_event_type AS ENUM ('comissao','bonificacao','imposto','estorno_integral','estorno_parcial','ajuste_positivo','ajuste_negativo','pagamento');
CREATE TYPE public.dre_classification AS ENUM ('custo_operacional','despesa_operacional','imposto_sobre_lucro','outro');
CREATE TYPE public.expense_status AS ENUM ('aguardando','paga','vencida');

-- commissions: novas colunas
ALTER TABLE public.commissions
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD COLUMN insurer_id uuid REFERENCES public.insurers(id),
  ADD COLUMN competencia date,
  ADD COLUMN base_calculo numeric,
  ADD COLUMN percentual numeric,
  ADD COLUMN modelo_pagamento public.payment_model,
  ADD COLUMN valor_previsto numeric;
UPDATE public.commissions c SET client_id = p.client_id, insurer_id = p.insurer_id,
  competencia = date_trunc('month', c.due_date)::date, valor_previsto = c.amount,
  base_calculo = COALESCE(p.premio_liquido, p.premio_total, p.premium), percentual = p.commission_pct
FROM public.policies p WHERE p.id = c.policy_id;
COMMENT ON COLUMN public.commissions.amount IS 'DEPRECATED: replaced by valor_previsto (frozen) + commission_events';
COMMENT ON COLUMN public.commissions.insurer IS 'DEPRECATED: replaced by insurer_id';
COMMENT ON COLUMN public.commissions.paid_at IS 'DEPRECATED: replaced by commission_events tipo comissao';
COMMENT ON COLUMN public.commissions.refunded_at IS 'DEPRECATED: replaced by commission_events estorno_*';
COMMENT ON COLUMN public.commissions.refund_reason IS 'DEPRECATED: replaced by commission_events.motivo';

-- installments
CREATE TABLE public.commission_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.commissions(id) ON DELETE CASCADE,
  numero_parcela integer NOT NULL,
  competencia date NOT NULL,
  valor_previsto numeric NOT NULL,
  status public.commission_status NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (commission_id, numero_parcela)
);
GRANT SELECT, INSERT, UPDATE ON public.commission_installments TO authenticated;
GRANT ALL ON public.commission_installments TO service_role;
ALTER TABLE public.commission_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance read installments" ON public.commission_installments FOR SELECT TO authenticated USING (public.has_page_access(auth.uid(),'financeiro_comissoes'));
CREATE POLICY "Finance write installments" ON public.commission_installments FOR INSERT TO authenticated WITH CHECK (public.has_page_access(auth.uid(),'financeiro_comissoes'));
CREATE POLICY "Finance update installments" ON public.commission_installments FOR UPDATE TO authenticated USING (public.has_page_access(auth.uid(),'financeiro_comissoes'));

-- events (append-only ledger)
CREATE TABLE public.commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.commissions(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES public.commission_installments(id),
  tipo public.commission_event_type NOT NULL,
  valor numeric NOT NULL CHECK (valor >= 0),
  motivo text,
  observacao text,
  documento_referencia text,
  criado_por uuid REFERENCES public.team_members(id) DEFAULT auth.uid(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT estorno_requires_motivo CHECK (tipo NOT IN ('estorno_integral','estorno_parcial') OR coalesce(trim(motivo),'') <> '')
);
CREATE INDEX commission_events_commission_idx ON public.commission_events(commission_id);
GRANT SELECT, INSERT ON public.commission_events TO authenticated;
GRANT ALL ON public.commission_events TO service_role;
ALTER TABLE public.commission_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance read events" ON public.commission_events FOR SELECT TO authenticated USING (public.has_page_access(auth.uid(),'financeiro_comissoes'));
CREATE POLICY "Finance insert events" ON public.commission_events FOR INSERT TO authenticated WITH CHECK (public.has_page_access(auth.uid(),'financeiro_comissoes'));
CREATE OR REPLACE FUNCTION public.trg_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN RAISE EXCEPTION 'Registro append-only: crie um evento de ajuste'; END $$;
CREATE TRIGGER commission_events_append_only BEFORE UPDATE OR DELETE ON public.commission_events FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION public.trg_append_only();

-- comissão reconhecida (soma assinada dos eventos)
CREATE OR REPLACE FUNCTION public.commission_recognized(_commission_id uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(sum(CASE WHEN tipo IN ('comissao','bonificacao','ajuste_positivo') THEN valor
    WHEN tipo IN ('imposto','estorno_integral','estorno_parcial','ajuste_negativo') THEN -valor ELSE 0 END), 0)
  FROM commission_events WHERE commission_id = _commission_id
$$;

-- payouts
CREATE TABLE public.commission_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.commissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.team_members(id),
  percentual_repasse numeric NOT NULL CHECK (percentual_repasse >= 0 AND percentual_repasse <= 100),
  valor_devido numeric NOT NULL DEFAULT 0,
  valor_pago numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (commission_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.commission_payouts TO authenticated;
GRANT ALL ON public.commission_payouts TO service_role;
ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payout read" ON public.commission_payouts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_page_access(auth.uid(),'financeiro_comissoes'));
CREATE POLICY "Payout insert" ON public.commission_payouts FOR INSERT TO authenticated WITH CHECK (public.has_page_access(auth.uid(),'financeiro_comissoes'));
CREATE POLICY "Payout update" ON public.commission_payouts FOR UPDATE TO authenticated USING (public.has_page_access(auth.uid(),'financeiro_comissoes'));
CREATE TRIGGER commission_payouts_updated_at BEFORE UPDATE ON public.commission_payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.trg_payout_set_devido() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN NEW.valor_devido := round(commission_recognized(NEW.commission_id) * NEW.percentual_repasse / 100, 2); RETURN NEW; END $$;
CREATE TRIGGER commission_payouts_devido BEFORE INSERT OR UPDATE OF percentual_repasse ON public.commission_payouts FOR EACH ROW EXECUTE FUNCTION public.trg_payout_set_devido();

CREATE OR REPLACE FUNCTION public.trg_event_recalc_payouts() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE commission_payouts SET valor_devido = round(commission_recognized(NEW.commission_id) * percentual_repasse / 100, 2)
  WHERE commission_id = NEW.commission_id;
  RETURN NULL;
END $$;
CREATE TRIGGER commission_events_recalc_payouts AFTER INSERT ON public.commission_events FOR EACH ROW EXECUTE FUNCTION public.trg_event_recalc_payouts();

-- payout payments
CREATE TABLE public.commission_payout_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.commission_payouts(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  valor numeric NOT NULL CHECK (valor > 0),
  usuario_responsavel uuid REFERENCES public.team_members(id) DEFAULT auth.uid(),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.commission_payout_payments TO authenticated;
GRANT ALL ON public.commission_payout_payments TO service_role;
ALTER TABLE public.commission_payout_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payout payments read" ON public.commission_payout_payments FOR SELECT TO authenticated USING (public.has_page_access(auth.uid(),'financeiro_comissoes') OR EXISTS (SELECT 1 FROM public.commission_payouts p WHERE p.id = payout_id AND p.user_id = auth.uid()));
CREATE POLICY "Payout payments insert" ON public.commission_payout_payments FOR INSERT TO authenticated WITH CHECK (public.has_page_access(auth.uid(),'financeiro_comissoes'));
CREATE TRIGGER commission_payout_payments_append_only BEFORE UPDATE OR DELETE ON public.commission_payout_payments FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION public.trg_append_only();

CREATE OR REPLACE FUNCTION public.trg_payment_sum() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE commission_payouts SET valor_pago = (SELECT COALESCE(sum(valor),0) FROM commission_payout_payments WHERE payout_id = NEW.payout_id) WHERE id = NEW.payout_id;
  RETURN NULL;
END $$;
CREATE TRIGGER commission_payout_payments_sum AFTER INSERT ON public.commission_payout_payments FOR EACH ROW EXECUTE FUNCTION public.trg_payment_sum();

-- Backfill: comissões pagas viram evento 'comissao'; devolvidas viram estorno integral
INSERT INTO public.commission_events (commission_id, tipo, valor, criado_por, criado_em, observacao)
SELECT id, 'comissao', amount, NULL, COALESCE(paid_at, updated_at), 'Migrado do modelo anterior'
FROM public.commissions WHERE status IN ('pago','devolvido') AND amount >= 0;
INSERT INTO public.commission_events (commission_id, tipo, valor, motivo, criado_por, criado_em, observacao)
SELECT id, 'estorno_integral', amount, COALESCE(NULLIF(trim(refund_reason),''),'Devolução (migrado)'), NULL, COALESCE(refunded_at, updated_at), 'Migrado do modelo anterior'
FROM public.commissions WHERE status = 'devolvido' AND amount >= 0;

-- expenses: novas colunas
ALTER TABLE public.expenses
  ADD COLUMN dre_classification public.dre_classification NOT NULL DEFAULT 'despesa_operacional',
  ADD COLUMN due_date date,
  ADD COLUMN status public.expense_status NOT NULL DEFAULT 'aguardando',
  ADD COLUMN paid_at timestamptz,
  ADD COLUMN created_by uuid REFERENCES public.team_members(id) DEFAULT auth.uid();
UPDATE public.expenses SET dre_classification = CASE dre_kind
  WHEN 'variavel' THEN 'custo_operacional'::public.dre_classification
  WHEN 'imposto' THEN 'imposto_sobre_lucro'::public.dre_classification
  WHEN 'outra' THEN 'outro'::public.dre_classification
  ELSE 'despesa_operacional'::public.dre_classification END;
COMMENT ON COLUMN public.expenses.dre_kind IS 'DEPRECATED: replaced by dre_classification';
COMMENT ON COLUMN public.expenses.recurrence IS 'DEPRECATED: spec v3 uses due_date + status';
COMMENT ON COLUMN public.expenses.due_day IS 'DEPRECATED: replaced by due_date';
COMMENT ON TABLE public.seller_payouts IS 'DEPRECATED: replaced by commission_payouts + commission_payout_payments';
COMMENT ON TABLE public.expense_entries IS 'DEPRECATED: expenses carry status/paid_at directly';