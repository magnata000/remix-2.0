# Vários papéis por usuário (Configurações → Usuários e permissões)

## O que o admin vê
- No formulário de criar/editar usuário, o seletor único de papel vira uma lista de caixas de marcar: Administrador, Pós-venda, Comercial. É preciso marcar pelo menos um.
- Na lista de usuários, a coluna de papel mostra todos os papéis da pessoa (ex.: "Pós-venda · Comercial").
- O admin pode editar os próprios papéis e adicionar outros, mas a caixa "Administrador" fica travada na própria linha.

## Regras
- Vale sempre o papel mais amplo para enxergar dados: com Administrador, vê e edita tudo. Com Pós-venda, vê toda a carteira. Só Comercial vê apenas o que é dele.
- Marcar ou desmarcar papéis não muda as páginas liberadas. As permissões de página continuam só manuais.
- O admin não pode tirar o próprio papel de Administrador. A regra de nunca ficar sem nenhum administrador ativo continua valendo.
- A opção "ver todas as oportunidades" só aparece quando o usuário não tem Administrador nem Pós-venda.

## Detalhes técnicos
1. Banco: `user_roles` já aceita várias linhas por usuário (unique user_id+role), e `has_role` / `can_view_all` já resolvem o papel mais amplo. Nenhuma tabela nova é necessária. Antes de mudar, confirmar por consulta a restrição de unicidade e as funções.
2. `settings.functions.ts`: a entrada passa de `roleLabel` para `roleLabels: RoleLabel[]` (pelo menos 1, valores válidos). `writeAccess` grava uma linha em `user_roles` por papel (`appRoleFor`). `team_members.role_label` guarda o papel principal (admin > pos_venda > comercial) para manter compatibilidade. A listagem devolve `roleLabels` lidos de `user_roles`. Validação no servidor: quando o id é o próprio usuário, `admin` é obrigatório.
3. Aprovação de solicitação de acesso e convite seguem o mesmo formato com lista.
4. `SettingsModule.tsx`: troca o Select por checkboxes, mostra badges na lista e trava a caixa "Administrador" na própria linha.
5. `profile.functions.ts` / `team.functions.ts`: já escolhem o papel mais amplo. Só falta conferir.
6. Teste: o papel principal é o mais amplo (Pós-venda + Comercial → pos_venda), e salvar a si mesmo sem admin é rejeitado.
7. AGENTS.md: um usuário pode ter vários papéis em `user_roles`; vale o mais amplo; `role_label` é só o papel principal derivado.
