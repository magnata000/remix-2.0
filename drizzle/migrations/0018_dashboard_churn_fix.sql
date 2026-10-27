CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(_year int, _month int, _branch_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _ms date := make_date(_year, _month, 1);
  _me date := (make_date(_year, _month, 1) + interval '1 month')::date;
  _today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _history_start date;
  _result jsonb;
BEGIN
  IF NOT public.has_page_access(auth.uid(), 'dashboard') THEN
    RAISE EXCEPTION 'Sem permissão para o Dashboard' USING ERRCODE = '42501';
  END IF;

  SELECT date_trunc('month', MIN(created_at AT TIME ZONE 'America/Sao_Paulo'))::date INTO _history_start
  FROM portfolio_timeline WHERE entity_type = 'policy';

  WITH active AS (
    SELECT p.id, p.client_id, p.branch_id, COALESCE(p.premio_total, p.premium, 0) AS premio
    FROM policies p WHERE p.status IN ('ativa','a_vencer','pendente') AND p.branch_id IS NOT NULL
  ),
  active_f AS (SELECT * FROM active WHERE _branch_id IS NULL OR branch_id = _branch_id),
  by_branch AS (
    SELECT b.id, b.name, b.code, SUM(a.premio) premio, COUNT(*) apolices, COUNT(DISTINCT a.client_id) clientes
    FROM active a JOIN branches b ON b.id = a.branch_id GROUP BY b.id, b.name, b.code
  ),
  months AS (
    SELECT (date_trunc('month', _ms) - make_interval(months => g))::date AS ms FROM generate_series(0, 11) g
  ),
  -- Perdas reais: uma por apólice, só quando o status atual confirma a perda.
  -- Não renovação ignora Saúde (vitalícia) e Consórcio (sem ciclo anual) e apólices já renovadas.
  losses AS (
    SELECT DISTINCT ON (t.entity_id, t.event_type) t.entity_id, t.event_type,
      (t.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS d, p.branch_id
    FROM portfolio_timeline t JOIN policies p ON p.id = t.entity_id
    LEFT JOIN branches b ON b.id = p.branch_id
    WHERE t.entity_type = 'policy'
      AND ((t.event_type = 'apolice_cancelada' AND p.status = 'cancelada')
        OR (t.event_type = 'apolice_nao_renovada' AND p.status = 'nao_renovada' AND p.renewed_to_id IS NULL
            AND COALESCE(b.name, '') NOT IN ('Saúde','Consórcio')))
    ORDER BY t.entity_id, t.event_type, t.created_at DESC
  ),
  churn AS (
    SELECT m.ms,
      (SELECT COUNT(*) FROM losses l WHERE l.event_type = 'apolice_cancelada'
         AND l.d >= m.ms AND l.d < (m.ms + interval '1 month')::date
         AND (_branch_id IS NULL OR l.branch_id = _branch_id)) canceladas,
      (SELECT COUNT(*) FROM losses l WHERE l.event_type = 'apolice_nao_renovada'
         AND l.d >= m.ms AND l.d < (m.ms + interval '1 month')::date
         AND (_branch_id IS NULL OR l.branch_id = _branch_id)) nao_renovadas,
      (SELECT COUNT(*) FROM policies p
        WHERE p.start_date < m.ms AND COALESCE(p.end_date, 'infinity'::date) >= m.ms
          AND (_branch_id IS NULL OR p.branch_id = _branch_id)
          AND NOT EXISTS (SELECT 1 FROM losses l WHERE l.entity_id = p.id AND l.event_type = 'apolice_cancelada' AND l.d < m.ms)) base,
      (_history_start IS NOT NULL AND m.ms >= _history_start) has_history
    FROM months m
  ),
  elig AS (
    SELECT p.status, p.renewed_to_id, p.end_date FROM policies p JOIN branches b ON b.id = p.branch_id
    WHERE p.end_date >= _ms AND p.end_date < _me AND b.name NOT IN ('Saúde','Consórcio')
      AND p.status <> 'cancelada' AND (_branch_id IS NULL OR p.branch_id = _branch_id)
  ),
  top_clients AS (
    SELECT c.id, c.name, SUM(a.premio) premio,
      array_agg(DISTINCT b.code ORDER BY b.code) codes
    FROM active_f a JOIN clients c ON c.id = a.client_id JOIN branches b ON b.id = a.branch_id
    GROUP BY c.id, c.name ORDER BY SUM(a.premio) DESC LIMIT 10
  )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'premio_total', COALESCE((SELECT SUM(premio) FROM active_f), 0),
      'apolices', (SELECT COUNT(*) FROM active_f),
      'clientes_unicos', (SELECT COUNT(DISTINCT client_id) FROM active_f)
    ),
    'by_branch', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', code,
        'premio', premio, 'apolices', apolices, 'clientes', clientes) ORDER BY premio DESC) FROM by_branch), '[]'::jsonb),
    'churn', COALESCE((SELECT jsonb_agg(jsonb_build_object('month', to_char(ms, 'YYYY-MM'),
        'canceladas', canceladas, 'nao_renovadas', nao_renovadas, 'base', base, 'has_history', has_history,
        'is_partial', (_today >= ms AND _today < (ms + interval '1 month')::date)) ORDER BY ms) FROM churn), '[]'::jsonb),
    'renewal', jsonb_build_object(
      'renovadas', (SELECT COUNT(*) FROM elig WHERE status = 'renovada' OR renewed_to_id IS NOT NULL),
      'aguardando', (SELECT COUNT(*) FROM elig WHERE status = 'vencida' AND renewed_to_id IS NULL),
      'nao_renovadas', (SELECT COUNT(*) FROM elig WHERE status = 'nao_renovada' AND renewed_to_id IS NULL),
      'futuras', (SELECT COUNT(*) FROM elig WHERE status IN ('ativa','a_vencer','pendente') AND renewed_to_id IS NULL),
      'total', (SELECT COUNT(*) FROM elig)
    ),
    'top_clients', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'premio', premio, 'codes', to_jsonb(codes)) ORDER BY premio DESC) FROM top_clients), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END $$;

REVOKE ALL ON FUNCTION public.get_dashboard_analytics(int, int, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics(int, int, uuid) TO authenticated;