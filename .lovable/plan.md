# Plano — Seed de dados demo no Supabase (BYO)

## Estado atual verificado

- O projeto Lovable está apontando para o Supabase `qogngwcgsbjnevrbpacj` (URL e publishable key presentes no `.env`).
- O schema em `docs/schema_initial.sql` já foi aplicado no banco (você confirmou isso anteriormente).
- Não tenho acesso direto ao banco a partir do shell do agente: `PGHOST` não está configurado e `SUPABASE_SERVICE_ROLE_KEY` não está exposta no ambiente de execução.
- Portanto, o seed será **gerado** por mim e **aplicado por você** no Supabase SQL Editor (ou via uma função temporária do app, se preferir fornecer acesso admin).

## Dificuldade central a resolver

As tabelas `clients`, `policies`, `tasks`, `opportunities`, `seller_commission_rates`, etc. referenciam `public.team_members(id)`. Por sua vez, `team_members.id` é chave estrangeira de `auth.users(id)` e a trigger `on_auth_user_created` sincroniza automaticamente `auth.users -> team_members`. Então, **antes de inserir qualquer dado operacional, precisamos decidir como os usuários demo serão criados**.

## Passos do plano

### 1. Definir os usuários de seed

Escolha uma das estratégias:

```text
A) Usuários demo
   - Criar 4 usuários no Supabase Dashboard: ana@..., carlos@..., mariana@..., joao@...insuranceos.com
   - Capturar os UUIDs gerados pelo Supabase Auth.
   - Vantagem: rápido e você pode logar com qualquer deles para ver os dados.

B) Usuários reais existentes
   - Você pega os UUIDs de `auth.users` no Supabase Dashboard.
   - O seed aponta todos os dados para esses usuários.
   - Vantagem: os dados já aparecem na conta que você realmente usa.
```

Depois da escolha, você me passa os UUIDs e eu gero o SQL.

### 2. Gerar `docs/seed_data.sql`

Baseado nos mocks existentes (`src/lib/mock/data.ts`), vou criar um único arquivo SQL com inserts determinísticos para:

- `public.commission_configs` — defaults por seguradora + produto (Saúde, Auto, Consórcio).
- `public.clients` — ~25 clientes, com `assignee_id` fixado nos UUIDs do passo 1.
- `public.policies` — apólices curadas (Saúde agenciamento, Auto esgotamento, Auto parcela, Consórcio) + genéricas, com vigência e comissionamento.
- `public.beneficiaries` — beneficiários para apólices de Saúde/Vida.
- `public.commissions` — parcelas geradas pelo motor de comissões, com status `pago`, `pendente`, `atrasado` e `devolvido`/`cancelada` para testar o card "Perdas de Receita".
- `public.opportunities` — oportunidades no kanban (lead, cotação, negociação, fechado, perdido).
- `public.tasks` — tarefas com vencimentos dentro de 3 dias, atrasadas e futuras.
- `public.expenses`, `public.expense_entries`, `public.manual_incomes`, `public.tax_entries` — dados para Caixa e DRE.
- `public.seller_commission_rates`, `public.seller_payouts` — para testar Repasses de Vendedores.
- `public.doc_folders` (opcional) — estrutura de pastas básica para Documentos.

O arquivo usará `TRUNCATE ... CASCADE` e `ON CONFLICT DO NOTHING` para ser reexecutável sem duplicar dados.

### 3. Aplicar o seed

Caminho recomendado (porque você está usando Supabase próprio):

1. Acesse o Supabase Dashboard do projeto `qogngwcgsbjnevrbpacj`.
2. Vá em **SQL Editor → New query**.
3. Cole o conteúdo de `docs/seed_data.sql`.
4. Execute a query.

Caminho alternativo (se você quiser que eu execute):

- Me fornecer a `SUPABASE_SERVICE_ROLE_KEY` de forma segura. Com ela, eu crio uma `createServerFn` temporária para fazer o seed via Auth Admin API + inserts. No entanto, o prefixo `SUPABASE_` é reservado para Lovable Cloud, então esse caminho exige uma configuração manual de secret ou execução local sua.

### 4. Verificar

Após aplicar, vou orientar você a rodar queries de sanity check:

```sql
SELECT 'clients' AS tabela, count(*) FROM public.clients
UNION ALL SELECT 'policies', count(*) FROM public.policies
UNION ALL SELECT 'commissions', count(*) FROM public.commissions
UNION ALL SELECT 'tasks', count(*) FROM public.tasks
UNION ALL SELECT 'opportunities', count(*) FROM public.opportunities;
```

E também validar que:

- `team_members` e `user_roles` existem para os usuários seed.
- Um usuário logado consegue ler os registros via RLS (policies vinculadas ao `assignee_id`).
- O dashboard Daily mostra tarefas, renovações e alertas de faixa etária.

### 5. Próximo passo natural (fora do escopo deste plano, mas importante)

Depois do seed aplicado, os stores do app (`clientStore`, `policyStore`, `taskStore`, etc.) ainda leem dos mocks locais. Se você quiser que a interface reflita o banco real, precisaremos conectar cada store ao Supabase via `createServerFn` / `useQuery`. Isso pode ser feito em um plano separado.

## Decisões pendentes

1. **Usuários**: prefere criar usuários demo (eu crio com senhas temporárias) ou usar UUIDs de usuários reais existentes?
2. **Escopo do seed**: quer incluir documentos/folders, ou só dados operacionais (clientes, apólices, comissões, tarefas, caixa, repasses)?
3. **Forma de aplicação**: prefere aplicar o SQL manualmente no Supabase Dashboard, ou quer que eu crie um server function temporário para aplicar o seed (o que exigiria a service role key)?
