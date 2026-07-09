
# Refatoração da aba Relatórios (Financeiro)

Escopo estrito: apenas a aba **Relatórios** (`src/components/financial/ReportTab.tsx`). Aba Caixa e demais módulos não são tocados. Reaproveita design system, `Card`, `Tabs`, `Select`, cores semânticas (`--brand`, `--success`, `--warning`, `--destructive`) e Recharts já em uso.

## 1. Configurações — Parâmetros da DRE (novo)

Novo store `src/lib/financial/dreConfigStore.tsx` com persistência em memória (padrão do projeto), expondo:

- `taxOnRevenuePct` (default 6%)
- `taxOnProfitPct` (default 15%)
- `categoryKind: Record<string, "custo_operacional" | "despesa_operacional">` (default: heurística inicial — Aluguel/Software/Infra → custo; Marketing/Viagens/Outros → despesa; editável)

Provider registrado em `src/routes/index.tsx` junto aos demais.

Nova seção `DreConfigSection` em `src/components/settings/` renderizada dentro de `SettingsModule.tsx`:
- Dois inputs percentuais (impostos).
- Lista de categorias existentes (derivadas de `expenses` + `entries`) com toggle Custo/Despesa.
- Botão "Restaurar padrões".

## 2. Filtros globais

Topo da aba Relatórios, componente local `ReportFilters`:
- **Período**: presets `Este mês`, `Mês anterior`, `Últimos 3 meses`, `Este ano`, `Ano anterior`, `Personalizado` (range picker existente do shadcn se disponível; senão dois inputs `type=date`).
- Filtros "Conta Bancária" e "Centro de Custo" ficam **omitidos** nesta iteração (schema atual não suporta).

Estado do filtro fica em `ReportTab` e alimenta todos os cálculos via `useMemo`. "Período anterior" para comparações = mesma duração imediatamente antes do range selecionado.

## 3. Camada de cálculo — `src/lib/financial/reportMetrics.ts` (novo)

Funções puras, testáveis, sem side effects:

- `filterByRange(items, dateField, range)`
- `revenue(commissions, range)` — soma de `commissions` com `status === "pago"` e `paidAt` no range (+ `incomes` manuais).
- `expensesTotal(entries, range)` — soma de `ExpenseEntry.paidAt` no range.
- `expensesByKind(entries, categoryKind, range)` → `{ custos, despesas }`.
- `dre(range, cfg)` → `{ receitaBruta, impostosReceita, receitaLiquida, custos, lucroBruto, despesas, lucroOperacional, impostosLucro, lucroLiquido }`.
- `projectedCashFlow(reference, cfg)` — saldo atual (histórico até hoje) + `commissions` pendentes com `dueDate` futuro − despesas mensais projetadas pelo `dueDay` até o fim do range.
- `delinquency(commissions, asOf)` → `{ valorEmAberto, pct, parcelas, clientes, serieMensal }`.
- `compare(current, previous)` → `{ delta, deltaPct, trend: "up"|"down"|"flat" }`.

`ReportTab` consome esses helpers em `useMemo` dependentes de `range`, `commissions`, `entries`, `incomes`, `dreConfig`.

## 4. Nova estrutura visual da aba

Arquivo `ReportTab.tsx` reescrito removendo os cards atuais (Ticket Médio, Receita×Comissões, Receita por Seguradora/Ramo/Vendedor). Nova ordem:

### 4.1 KPIs (grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-5`)
Componente reutilizável `KpiCard` (novo, em `src/components/financial/KpiCard.tsx`) com: título, valor, delta % vs período anterior, seta ↑/↓ (verde/vermelho), `Tooltip` explicativo (shadcn), skeleton loading. Cinco cards: Receita Bruta, Receita Líquida, Lucro Líquido, Margem, Fluxo de Caixa Projetado (breakdown Saldo Atual + Recebimentos − Pagamentos = Projetado).

### 4.2 Fluxo de Caixa Mensal
Mantém o gráfico atual (LineChart entradas/saídas/saldo) sem alterar a lógica; apenas passa a respeitar o range do filtro.

### 4.3 DRE Simplificada — `DreTable` (novo, `src/components/financial/DreTable.tsx`)
`Table` do shadcn com linhas expansíveis (`Collapsible`):
- Receita Bruta (expande em: comissões pagas + receitas manuais)
- (−) Impostos sobre Receita
- **Receita Líquida** (subtotal destacado — `bg-muted/40 font-medium`)
- (−) Custos Operacionais (expande em categorias marcadas como custo)
- **Lucro Bruto**
- (−) Despesas Operacionais (expande em categorias marcadas como despesa)
- **Lucro Operacional**
- (−) Impostos sobre Lucro
- **Lucro Líquido** (destaque forte — `bg-brand/10 font-bold`)

### 4.4 Receita Prevista × Realizada
`LineChart` com duas séries mensais dentro do range:
- Realizada: `commissions.status === "pago"` por `paidAt`.
- Prevista: `commissions` (qualquer status ≠ cancelada/devolvida) por `dueDate`.
Estrutura preparada para futuramente somar renovações e parcelas contratadas.

### 4.5 Despesas (grid 2 colunas)
- **Por Categoria**: PieChart atual (mantido, com filtro do range).
- **Evolução das Despesas**: novo `AreaChart` mensal de `expensesTotal` no range.

### 4.6 Evolução Financeira
`LineChart` com Tabs (`Mês anterior` · `Ano anterior` · `Acumulado`) alternando as séries comparativas de Receita Líquida × Lucro Líquido.

### 4.7 Inadimplência
Grid: 4 mini-KPIs (Valor em Aberto, % Inadimplência, Parcelas em Atraso, Clientes Inadimplentes) + `BarChart` mensal da série `delinquency.serieMensal`.

## 5. UX/estados

- `KpiCard` e todos os gráficos aceitam `loading?: boolean` mostrando `Skeleton`.
- Empty state em cada bloco: `<div className="h-full flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-xl">Sem dados no período.</div>` (padrão já usado no PieChart atual).
- `formatBRL` (existente) para valores; helper `formatPct(n, 2)` novo para percentuais.
- `Tooltip` do shadcn nos títulos dos KPIs explicando a fórmula.

## 6. Detalhes técnicos

Arquivos novos:
- `src/lib/financial/dreConfigStore.tsx`
- `src/lib/financial/reportMetrics.ts`
- `src/components/financial/KpiCard.tsx`
- `src/components/financial/DreTable.tsx`
- `src/components/financial/ReportFilters.tsx`
- `src/components/settings/DreConfigSection.tsx`

Arquivos editados:
- `src/components/financial/ReportTab.tsx` (reescrita completa mantendo imports/utilitários reaproveitáveis)
- `src/components/modules/SettingsModule.tsx` (nova seção DRE)
- `src/routes/index.tsx` (adicionar `DreConfigProvider` na árvore de providers)

Nada de novas dependências. Sem alterações em stores existentes, `KanbanModule`, aba Caixa ou Repasses.

## 7. Critérios de aceite

- Aba Relatórios exibe exatamente a ordem: Filtros → KPIs → Fluxo de Caixa Mensal → DRE → Receita Prevista×Realizada → Despesas (Categoria + Evolução) → Evolução Financeira → Inadimplência.
- Todos os blocos reagem ao seletor de Período.
- DRE expansível com subtotais destacados; alíquotas e classificação de categorias vêm de Configurações e são editáveis.
- KPIs mostram delta vs período anterior com seta e cor.
- Inadimplência calculada só a partir de `commissions.status === "atrasado"`.
- Fluxo de Caixa Mensal mantém lógica atual (entradas/saídas/saldo).
- Cards com altura uniforme (`h-full` no grid), espaçamento consistente (`space-y-5`, `gap-4`), cores do design system, sem `text-white`/hex hardcoded.
- Aba Caixa intocada; nenhum indicador comercial ou de vendedores na aba.
