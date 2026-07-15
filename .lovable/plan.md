## Objetivo

Criar um único arquivo `docs/DATABASE_SCHEMA.md` que sirva como fonte da verdade tanto para o produto (regras de negócio) quanto para IA (schema prompt-ready). Nenhum código de aplicação será alterado — é somente documentação.

## Estrutura do arquivo

### Cabeçalho
- Título, propósito, como usar (copiar Parte 2 no início de novos chats de IA).
- Índice navegável.

### PARTE 1 — Guia de Regras de Negócio

1. **Domínio & Glossário** — Corretor, Cliente, Apólice, Ramo (Auto/Vida/Residencial/Empresarial/Saúde/Consórcio), Seguradora (Porto/Bradesco/SulAmérica/Allianz/Mapfre), Comissão, Beneficiário.
2. **Fluxo de Vendas e Emissão** — Pipeline (`lead → cotacao → negociacao → fechado/perdido`) → criação de Cliente → emissão de Apólice (número, ramo, seguradora, prêmio, vigência, `assigneeId`) → geração automática do cronograma de comissões pelo `commissionEngine`. Estados de apólice: `ativa | vencida | pendente | cancelada | renovada`. Cascata de cancelamento: comissões `pago` → `devolvido`, `pendente/atrasado` → `cancelada`.
3. **Regra de Ouro da Comissão (destacada em negrito)** — **Cada apólice armazena a sua própria porcentagem e configuração de comissão (`commissionPct`, `commissionScheme`, `commissionInstallments`, `agenciamentoSchedule`, `recorrenciaPct`, `comissaoLiquida`, `taxaImposto`).** As configurações da seguradora servem apenas como default; o valor real congelado no fechamento é o da apólice. Nunca recalcular retroativamente a partir do config global.
4. **Motor de Comissões (`commissionEngine`)** — Mapeamento `branch → produto` (Saúde, Consórcio, Auto/demais). Esquemas por produto:
   - **Saúde – Agenciamento:** parcelas fixas `[1.0, 0.5, 0.3, 0.2] × mensalidade`, uma por mês desde `startDate`.
   - **Saúde – Vitalício:** sem parcelas fixas; recorrência `recorrenciaPct × mensalidade` a partir da parcela X.
   - **Saúde – Recorrência mensal:** gerada mês-a-mês por `expectedRecurrencesUntil` até o mês corrente.
   - **Consórcio – Única:** 1 comissão = `premium × commissionPct/100`, D+30.
   - **Auto/Vida/Res/Emp – Esgotamento:** 1 pagamento total, D+30.
   - **Auto/Vida/Res/Emp – Parcela:** N parcelas iguais mensais.
   - **Impostos:** se `comissaoLiquida = true`, aplicar `valor × (1 - taxaImposto)` (default 11,5%).
5. **Módulo Diário (Daily)** — Menções `@Nome` (match guloso, suporta acentos) resolvidas via `TeamNameIndex`; `@todos` é broadcast. Alertas inteligentes: renovações próximas do `endDate`, faixa etária (Saúde) usando `ageBands`, prazos SLA.

### PARTE 2 — Dicionário Técnico Prompt-Ready

Começa com callout **"Copie a partir daqui em novos chats de IA"** e contém apenas o essencial denso.

1. **ERD (Mermaid `erDiagram`)** — Entidades: `team_members`, `clients`, `policies`, `beneficiaries`, `commissions`, `commission_configs`, `opportunities` (kanban), `tasks`. Relacionamentos com cardinalidades.
2. **Schema SQL Postgres/Supabase (DDL completo)** — em blocos ```sql:
   - Enums: `policy_status`, `client_status`, `branch`, `insurer`, `commission_scheme`, `commission_kind`, `commission_status`, `kanban_stage`, `lost_reason`, `beneficiary_title`, `app_role`.
   - Tabelas com `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, FKs corretas, `NUMERIC(14,2)` para dinheiro e `NUMERIC(6,4)` para percentuais, `created_at`/`updated_at TIMESTAMPTZ DEFAULT now()`, trigger `set_updated_at`.
   - Tabela `user_roles` separada + função `has_role()` SECURITY DEFINER (padrão de segurança).
   - GRANTs explícitos (`authenticated`, `service_role`) por tabela.
   - Índices em FKs e colunas de filtro (`status`, `due_date`, `assignee_id`).
3. **Mapeamento TS ↔ Postgres** — Tabelas markdown para `Client`, `Policy`, `Commission`, `TeamMember`, `Beneficiary`, com colunas: TS field, TS type, coluna SQL, tipo SQL, nulidade, notas (ex.: `premium: number` → `premium NUMERIC(14,2) NOT NULL`; `commissionPct?: number` → `commission_pct NUMERIC(6,4)`; `agenciamentoSchedule?: number[]` → `agenciamento_schedule NUMERIC(6,4)[]`).
4. **RLS (Row Level Security)** — `ALTER TABLE ... ENABLE RLS` em todas as tabelas de domínio. Políticas:
   - `team_members`: usuário lê o próprio registro + admin lê todos via `has_role`.
   - `clients` / `policies` / `commissions` / `tasks`: SELECT/UPDATE/DELETE onde `assignee_id = auth.uid()` OU `public.has_role(auth.uid(), 'admin')`; INSERT com `assignee_id = auth.uid()` como default.
   - `beneficiaries`: escopo herdado da apólice pai (via `EXISTS`).
   - `commission_configs`: leitura para `authenticated`, escrita só para `admin`.
5. **Variáveis de Ambiente** — Tabela: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (browser); `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only); com nota sobre escopos e onde cada uma é consumida.

## Fontes usadas para extrair a verdade

- `src/lib/mock/data.ts` — tipos canônicos.
- `src/lib/financial/commissionEngine.ts` — regras dos esquemas.
- `src/lib/financial/commissionStore.tsx` — cascata de cancelamento e recorrência.
- `src/lib/daily/mentions.ts` — regras de @menções.
- `src/lib/branches/branchStore.ts`, `src/lib/insurers/insurerStore.ts` — enums de domínio.

## Arquivos alterados

- **Criar:** `docs/DATABASE_SCHEMA.md` (único arquivo desta entrega).
- **Nenhum código de aplicação será modificado.** Arquivos protegidos (`DashboardModule.tsx`, `RenewPolicyDialog.tsx`, `ComingSoonOverlay.tsx`, `use-mobile.tsx`, `router.tsx`, `components/ui/*`, `routeTree.gen.ts`) permanecem intactos.

## Validação

- `tsgo` e `lint` continuam verdes por definição (só doc `.md`).
- Diagrama Mermaid validado por sintaxe `erDiagram`.

Ao término, retorno um resumo com a árvore de seções e destaques do conteúdo.
