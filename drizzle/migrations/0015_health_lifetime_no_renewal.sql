CREATE OR REPLACE FUNCTION public.refresh_policy_statuses(_today date)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  -- Saúde é vitalícia: nunca vence nem vira não renovada; só sai de 'ativa' por cancelamento manual.
  WITH calc AS (
    SELECT p.id, CASE
      WHEN b.name = 'Saúde' OR p.end_date IS NULL OR _today < p.end_date - 30 THEN 'ativa'
      WHEN _today <= p.end_date THEN 'a_vencer'
      WHEN _today <= p.end_date + 15 THEN 'vencida'
      ELSE 'nao_renovada' END::policy_status AS s
    FROM policies p LEFT JOIN branches b ON b.id = p.branch_id
    WHERE p.status IN ('ativa','a_vencer','vencida','nao_renovada','pendente')
  )
  UPDATE policies p SET status = calc.s FROM calc WHERE calc.id = p.id AND p.status IS DISTINCT FROM calc.s;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $function$;

CREATE OR REPLACE FUNCTION public.trg_policy_health_lifetime() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM branches WHERE id = NEW.branch_id AND name = 'Saúde') THEN
    NEW.end_date := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER policies_health_lifetime BEFORE INSERT OR UPDATE ON public.policies
FOR EACH ROW EXECUTE FUNCTION public.trg_policy_health_lifetime();