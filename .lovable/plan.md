## Objetivo

Converter o schema documentado em `docs/DATABASE_SCHEMA.md` em uma migration única e aplicá-la no projeto Supabase já conectado, garantindo tabelas, RLS, GRANTs e triggers corretos.

## Passos

### 1. Revisar e preparar o schema
- Ler `docs/DATABASE_SCHEMA.md` e validar a ordem correta:
  - extensions → enums → tabelas core (`clients`, `team_members`, `user_roles`, `insurers`, `branches`)
  - portfolio (`policies`, `beneficiaries`, `documents`)
  - pipeline (`opportunities`, `tasks`, `task_comments`)
  - financeiro (`commissions`, `expenses`, `taxes`, `cash_movements`, `seller_commission_rates`, `seller_payouts`)
  - funções + triggers → RLS + policies → grants
- Confirmar que cada `CREATE TABLE public.*` é seguido por `GRANT` para `authenticated` e `service_role` (e `anon` apenas onde haja policy pública).
- Confirmar que `user_roles` usa enum `app_role` + função `has_role()` como `SECURITY DEFINER` para evitar recursão de RLS.
- Confirmar trigger `on_auth_user_created` para sync `auth.users` → `public.team_members`.

### 2. Criar e aplicar migration única
- Criar uma migration com o schema completo.
- Aplicar via ferramenta de migration do Lovable (nunca `psql` direto).
- Garantir que o banco inicie vazio (sem `INSERT` de dados), conforme escolhido.

### 3. Verificação pós-migration
- Listar tabelas criadas.
- Conferir que todas têm RLS habilitado.
- Conferir GRANTs aplicados.
- Rodar scanner de segurança e corrigir findings de policy/grant, se houver.

### 4. Atualizar tipos do Supabase
- Regenerar `src/integrations/supabase/types.ts` a partir do schema aplicado (processo automático da integração).

### 5. Fora de escopo desta etapa
- A app continua rodando com stores em memória.
- A migração dos consumidores (`policyStore`, `clientStore`, `commissionStore`, `sellerPayoutStore` etc.) para leitura/escrita real no banco será feita em etapas seguintes, começando pelos repasses de vendedores.

## Detalhes técnicos

- Stack TanStack Start: acesso ao banco será via `createServerFn` + `requireSupabaseAuth`; sem Edge Functions.
- Nenhum arquivo de UI será alterado nesta etapa, exceto os gerados pela integração (`types.ts`).
- A migration conterá apenas schema (DDL), sem dados.