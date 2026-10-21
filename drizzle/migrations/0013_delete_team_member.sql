ALTER TABLE public.follow_ups DROP CONSTRAINT follow_ups_created_by_fkey, ADD CONSTRAINT follow_ups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.team_members(id) ON DELETE SET NULL;
ALTER TABLE public.expenses DROP CONSTRAINT expenses_created_by_fkey, ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.team_members(id) ON DELETE SET NULL;
ALTER TABLE public.seller_payouts DROP CONSTRAINT seller_payouts_created_by_fkey, ADD CONSTRAINT seller_payouts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.team_members(id) ON DELETE SET NULL;
ALTER TABLE public.access_requests DROP CONSTRAINT access_requests_resolved_by_fkey, ADD CONSTRAINT access_requests_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.team_members(id) ON DELETE SET NULL;
-- Append-only ledgers: keep the historical author id, no FK (an ON DELETE SET NULL would be an UPDATE blocked by trg_append_only).
ALTER TABLE public.commission_events DROP CONSTRAINT commission_events_criado_por_fkey;
ALTER TABLE public.commission_payout_payments DROP CONSTRAINT commission_payout_payments_usuario_responsavel_fkey;

CREATE OR REPLACE FUNCTION public.delete_team_member(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid();
BEGIN
  IF _me IS NULL OR NOT public.has_role(_me, 'admin') THEN RAISE EXCEPTION 'Apenas administradores podem excluir usuários.'; END IF;
  IF _user_id = _me THEN RAISE EXCEPTION 'Você não pode excluir o próprio usuário.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM team_members WHERE id = _user_id) THEN RAISE EXCEPTION 'Usuário não encontrado.'; END IF;
  IF public.has_role(_user_id, 'admin') AND (
    SELECT count(*) FROM user_roles r JOIN team_members m ON m.id = r.user_id
    WHERE r.role = 'admin' AND m.status = 'ativo' AND r.user_id <> _user_id) = 0 THEN
    RAISE EXCEPTION 'Não é possível excluir o último administrador.';
  END IF;
  UPDATE clients SET assignee_id = _me WHERE assignee_id = _user_id;
  UPDATE policies SET assignee_id = _me WHERE assignee_id = _user_id;
  UPDATE opportunities SET assignee_id = _me WHERE assignee_id = _user_id;
  UPDATE tasks SET assignee_id = _me WHERE assignee_id = _user_id;
  UPDATE scheduled_tasks SET assignee_id = _me WHERE assignee_id = _user_id;
  UPDATE commission_payouts SET user_id = _me WHERE user_id = _user_id;
  UPDATE seller_payouts SET seller_id = _me WHERE seller_id = _user_id;
  DELETE FROM access_requests WHERE user_id = _user_id;
  DELETE FROM user_roles WHERE user_id = _user_id;
  DELETE FROM team_members WHERE id = _user_id;
END $$;
REVOKE ALL ON FUNCTION public.delete_team_member(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_team_member(uuid) TO authenticated;