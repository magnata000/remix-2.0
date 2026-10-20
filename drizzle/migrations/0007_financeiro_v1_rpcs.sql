CREATE OR REPLACE FUNCTION public.assert_finance() RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN IF NOT has_page_access(auth.uid(), 'financeiro_comissoes') THEN RAISE EXCEPTION 'Sem permissão'; END IF; END $$;

-- Gera comissão prevista + parcelas + 1º evento 'comissao' (+ repasse opcional)
CREATE OR REPLACE FUNCTION public.create_policy_commission(_policy_id uuid, _base_calculo numeric, _percentual numeric,
  _modelo payment_model, _parcelas integer DEFAULT 1, _repasse_user uuid DEFAULT NULL, _repasse_pct numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p policies; cid uuid; total numeric; n int := greatest(coalesce(_parcelas,1),1); i int; each numeric; acc numeric := 0; cname text;
BEGIN
  IF NOT (can_access_policy(auth.uid(), _policy_id) OR has_page_access(auth.uid(),'financeiro_comissoes')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _base_calculo IS NULL OR _base_calculo < 0 OR _percentual IS NULL OR _percentual < 0 OR _percentual > 100 THEN RAISE EXCEPTION 'Base ou percentual inválido'; END IF;
  SELECT * INTO p FROM policies WHERE id = _policy_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Apólice não encontrada'; END IF;
  SELECT name INTO cname FROM clients WHERE id = p.client_id;
  total := round(_base_calculo * _percentual / 100, 2);
  INSERT INTO commissions (policy_id, policy_number, client_name, insurer, amount, due_date, status, client_id, insurer_id,
    competencia, base_calculo, percentual, modelo_pagamento, valor_previsto, installment_total)
  VALUES (p.id, p.number, coalesce(cname,''), p.insurer, total, p.start_date, 'pendente', p.client_id, p.insurer_id,
    date_trunc('month', p.start_date)::date, _base_calculo, _percentual, _modelo, total, n)
  RETURNING id INTO cid;
  each := round(total / n, 2);
  FOR i IN 1..n LOOP
    INSERT INTO commission_installments (commission_id, numero_parcela, competencia, valor_previsto)
    VALUES (cid, i, (date_trunc('month', p.start_date) + make_interval(months => i-1))::date,
      CASE WHEN i = n THEN total - acc ELSE each END);
    acc := acc + each;
  END LOOP;
  INSERT INTO commission_events (commission_id, tipo, valor) VALUES (cid, 'comissao', total);
  IF _repasse_user IS NOT NULL AND coalesce(_repasse_pct,0) > 0 THEN
    INSERT INTO commission_payouts (commission_id, user_id, percentual_repasse) VALUES (cid, _repasse_user, _repasse_pct);
  END IF;
  RETURN cid;
END $$;

-- Evento manual (imposto, bonificação, estorno, ajuste)
CREATE OR REPLACE FUNCTION public.add_commission_event(_commission_id uuid, _tipo commission_event_type, _valor numeric,
  _motivo text DEFAULT NULL, _observacao text DEFAULT NULL, _documento text DEFAULT NULL, _installment_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE eid uuid;
BEGIN
  PERFORM assert_finance();
  IF _tipo IN ('comissao','pagamento') THEN RAISE EXCEPTION 'Use a geração/conciliação para este tipo'; END IF;
  INSERT INTO commission_events (commission_id, installment_id, tipo, valor, motivo, observacao, documento_referencia)
  VALUES (_commission_id, _installment_id, _tipo, _valor, _motivo, _observacao, _documento) RETURNING id INTO eid;
  UPDATE commissions SET status = CASE WHEN _tipo = 'estorno_integral' THEN 'estornada'::commission_status
    WHEN status IN ('conciliada','parcial','divergente') THEN 'ajustada'::commission_status ELSE status END
  WHERE id = _commission_id;
  RETURN eid;
END $$;

-- Conciliação: registra recebimento; diferença exige evento explicativo
CREATE OR REPLACE FUNCTION public.reconcile_commission(_commission_id uuid, _valor_recebido numeric,
  _tipo_diferenca commission_event_type DEFAULT NULL, _motivo text DEFAULT NULL, _observacao text DEFAULT NULL, _installment_id uuid DEFAULT NULL)
RETURNS commission_status LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE reconhecido numeric; recebido numeric; diff numeric; st commission_status;
BEGIN
  PERFORM assert_finance();
  IF _valor_recebido IS NULL OR _valor_recebido < 0 THEN RAISE EXCEPTION 'Valor recebido inválido'; END IF;
  IF _valor_recebido > 0 THEN
    INSERT INTO commission_events (commission_id, installment_id, tipo, valor, observacao)
    VALUES (_commission_id, _installment_id, 'pagamento', _valor_recebido, _observacao);
  END IF;
  SELECT COALESCE(sum(valor),0) INTO recebido FROM commission_events WHERE commission_id = _commission_id AND tipo = 'pagamento';
  reconhecido := commission_recognized(_commission_id);
  diff := round(recebido - reconhecido, 2);
  IF diff <> 0 AND _tipo_diferenca IS NOT NULL THEN
    IF (diff < 0 AND _tipo_diferenca NOT IN ('imposto','estorno_parcial','estorno_integral','ajuste_negativo'))
       OR (diff > 0 AND _tipo_diferenca NOT IN ('bonificacao','ajuste_positivo')) THEN
      RAISE EXCEPTION 'Tipo de evento incompatível com a diferença'; END IF;
    INSERT INTO commission_events (commission_id, installment_id, tipo, valor, motivo, observacao)
    VALUES (_commission_id, _installment_id, _tipo_diferenca, abs(diff), _motivo, _observacao);
    st := CASE WHEN _tipo_diferenca = 'estorno_integral' THEN 'estornada' ELSE 'ajustada' END;
  ELSIF diff = 0 THEN st := 'conciliada';
  ELSIF diff < 0 AND recebido > 0 THEN st := 'parcial';
  ELSE st := 'divergente';
  END IF;
  UPDATE commissions SET status = st WHERE id = _commission_id;
  IF _installment_id IS NOT NULL THEN UPDATE commission_installments SET status = st WHERE id = _installment_id; END IF;
  RETURN st;
END $$;

CREATE OR REPLACE FUNCTION public.set_commission_payout(_commission_id uuid, _user_id uuid, _pct numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE pid uuid;
BEGIN
  PERFORM assert_finance();
  INSERT INTO commission_payouts (commission_id, user_id, percentual_repasse) VALUES (_commission_id, _user_id, _pct)
  ON CONFLICT (commission_id, user_id) DO UPDATE SET percentual_repasse = EXCLUDED.percentual_repasse
  RETURNING id INTO pid;
  RETURN pid;
END $$;

CREATE OR REPLACE FUNCTION public.pay_commission_payout(_payout_id uuid, _valor numeric, _data date DEFAULT CURRENT_DATE, _observacao text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE pid uuid; pend numeric;
BEGIN
  PERFORM assert_finance();
  SELECT valor_devido - valor_pago INTO pend FROM commission_payouts WHERE id = _payout_id;
  IF pend IS NULL THEN RAISE EXCEPTION 'Repasse não encontrado'; END IF;
  IF _valor > pend THEN RAISE EXCEPTION 'Valor acima do pendente (%)', pend; END IF;
  INSERT INTO commission_payout_payments (payout_id, data, valor, observacao) VALUES (_payout_id, _data, _valor, _observacao) RETURNING id INTO pid;
  RETURN pid;
END $$;

-- "Meu repasse": somente do usuário logado, sem observação/base/percentual da corretora
CREATE OR REPLACE FUNCTION public.my_payouts()
RETURNS TABLE (payout_id uuid, commission_id uuid, policy_number text, client_name text, competencia date, status commission_status,
  percentual_repasse numeric, valor_devido numeric, valor_pago numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT po.id, c.id, c.policy_number, c.client_name, c.competencia, c.status, po.percentual_repasse, po.valor_devido, po.valor_pago
  FROM commission_payouts po JOIN commissions c ON c.id = po.commission_id WHERE po.user_id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.my_payout_events()
RETURNS TABLE (commission_id uuid, tipo commission_event_type, criado_em timestamptz, valor numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT e.commission_id, e.tipo, e.criado_em, e.valor FROM commission_events e
  WHERE EXISTS (SELECT 1 FROM commission_payouts po WHERE po.commission_id = e.commission_id AND po.user_id = auth.uid())
$$;

-- Despesas
CREATE OR REPLACE FUNCTION public.pay_expense(_expense_id uuid, _paid_at timestamptz DEFAULT now())
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT has_page_access(auth.uid(),'financeiro_despesas') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE expenses SET status = 'paga', paid_at = _paid_at WHERE id = _expense_id AND status <> 'paga';
  IF NOT FOUND THEN RAISE EXCEPTION 'Despesa não encontrada ou já paga'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.refresh_expense_statuses(_today date) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  UPDATE expenses SET status = 'vencida' WHERE status = 'aguardando' AND due_date IS NOT NULL AND due_date < _today;
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.refresh_expense_statuses(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_expense_statuses(date) TO service_role;