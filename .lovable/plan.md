# Excluir usuário em Configurações → Usuários e permissões

## O que o admin vê
- Botão "Excluir" (lixeira) em cada linha da lista de usuários, oculto na própria linha do admin.
- Janela de confirmação: "Tudo que está atribuído a {nome} (clientes, apólices, oportunidades, tarefas e tarefas agendadas) passará para você. O histórico é mantido. Esta ação não pode ser desfeita."
- Após confirmar, o usuário some da lista e perde o acesso na hora.

## Regras
- Só administradores podem excluir; ninguém exclui a si mesmo.
- Não é possível excluir o último administrador ativo.
- Tudo que estava atribuído ao usuário passa para o admin que fez a exclusão.
- Histórico (comentários, linha do tempo, follow-ups, repasses e pagamentos) é mantido; o autor aparece como "Usuário removido".
- A conta de login é apagada, então o usuário não entra mais nem com o mesmo e-mail (se tentar criar conta de novo, cai como solicitação pendente).

## Detalhes técnicos
1. Função no banco `delete_team_member(_user_id uuid)` (SECURITY DEFINER, numa única transação):
   - valida `has_role(auth.uid(),'admin')`, não é o próprio, não é o último admin;
   - reatribui `assignee_id` em clients, policies, opportunities, tasks, scheduled_tasks para `auth.uid()`;
   - ajusta FKs que apontam para team_members e precisam ser preservadas (follow_ups.created_by, expenses.created_by, commission_events.criado_por, commission_payout_payments.usuario_responsavel, access_requests.resolved_by, notifications.recipient_user_id, seller_payouts) para `ON DELETE SET NULL` (via migração aditiva, recriando as constraints);
   - `commission_payouts.user_id` e `seller_commission_rates`/`seller_payouts.seller_id` são NOT NULL: payouts são transferidos ao admin executor; taxas do vendedor são apagadas;
   - apaga user_permissions, user_roles, access_requests do usuário e a linha em team_members.
   - Antes, conferir via consulta todas as FKs reais para team_members e ajustar a lista.
2. Server fn `deleteSettingsUser` em `settings.functions.ts`: requireSupabaseAuth → chama a RPC com o cliente do usuário → depois `supabaseAdmin.auth.admin.deleteUser(id)` para apagar o login (encerra sessões).
3. `SettingsModule.tsx`: botão + AlertDialog, invalida a lista de usuários e a equipe.
4. Nomes de autores ausentes exibidos como "Usuário removido" nas timelines/comentários.
5. Teste: regra "não pode excluir a si mesmo / último admin" na validação.
6. Registrar no AGENTS.md: exclusão de usuário é feita pela RPC delete_team_member (reatribuição centralizada no banco).
