## Pré-requisito (você)

Conecte o Supabase pela UI do Lovable (Integrações → Supabase → autorizar → organização **SaaS** → projeto **The Insurance OS**). Eu não consigo escolher org/projeto pelo chat. Assim que a conexão aparecer, sigo com os passos abaixo.

## 1. Validar o schema antes de aplicar

Revisar `docs/DATABASE_SCHEMA.md` (810 linhas) e ajustar para as regras obrigatórias do Supabase:

- **GRANTs**: cada `CREATE TABLE public.*` precisa de `GRANT` explícito (`authenticated`, `service_role`; `anon` só onde houver policy pública). Sem isso a API retorna "permission denied".
- **user_roles**: enum `app_role` + tabela separada + função `has_role()` `SECURITY DEFINER` (sem recursão de RLS) — já previsto no doc, apenas confirmar.
- **Sync auth.users → team_members**: trigger `on_auth_user_created` conforme o doc.
- Ordem correta por tabela: `CREATE TABLE` → `GRANT` → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY`.

## 2. Aplicar em uma migration única

Uma migration com o schema completo, na ordem:

```text
extensions → enums → tabelas core (clients, team_members, user_roles, insurers, branches)
→ portfolio (policies, beneficiaries, documents)
→ pipeline (opportunities, tasks, task_comments)
→ financeiro (commissions, expenses, taxes, cash_movements, seller_commission_rates, seller_payouts)
→ funções + triggers → RLS + policies → grants
```

Sem `INSERT` de dados — banco vazio, conforme escolhido.

## 3. Verificação pós-migration

- Listar tabelas criadas e conferir que todas têm RLS habilitada e GRANTs.
- Rodar o scanner de segurança e corrigir findings de policy/grant.
- Gerar os tipos do banco em `src/integrations/supabase/types.ts` (feito automaticamente pela integração).

## 4. Fora de escopo desta etapa

A app continua rodando com os stores em memória. A migração dos consumidores (`policyStore`, `clientStore`, `commissionStore`, `sellerPayoutStore` etc.) para leitura/escrita real no banco é um passo seguinte, feito store a store — começando pelos repasses de vendedores, que foi o gatilho original.

## Detalhes técnicos

- Migrations aplicadas pela ferramenta de migration (schema apenas), nunca por `psql` direto.
- Stack TanStack Start: acesso ao banco via `createServerFn` + `requireSupabaseAuth`; nada de Edge Functions.
- Nenhum arquivo de UI é alterado nesta etapa, exceto os gerados pela integração.
