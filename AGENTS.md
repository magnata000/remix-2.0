- Carteira business rules (policy number, renewal chain, status transitions, timeline, client delete-vs-deactivate) live in database triggers/RPCs; app code calls them instead of reimplementing — keeps a single source of truth.
- Branches and insurers are data tables (branches/insurers) referenced by FK; legacy enum columns on policies are deprecated bridges.
- Page access is per user (user_permissions by page_key, checked via has_page_access / moduleAccess); team_members.role_label is only a label, user_roles stays the technical role for data-visibility RLS — never gate pages by role.
- Notifications are created/resolved by database triggers (access requests, nao_renovada policies, motivo_registrado); UI only reads and marks read_at.
- Commission defaults come from commission_config (insurer_id + branch_id); legacy commission_configs is deprecated; tax is never configured, only logged as a commission event.

- Financeiro: commission_events and commission_payout_payments are append-only ledgers (trigger trg_append_only); recognized commission = commission_recognized(); payout valor_devido/valor_pago are maintained by triggers — app code only inserts events/payments.
- User deletion goes through the delete_team_member RPC (reassigns ownership to the deleting admin in one transaction), then the auth account is deleted server-side.
