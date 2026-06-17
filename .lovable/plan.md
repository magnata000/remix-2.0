
# Módulo Financeiro → Abas Caixa + Relatório

Reorganiza `FinancialModule` em um `Tabs` com duas abas: **Caixa** (operacional) e **Relatório** (analítico). KPIs e tabela de comissões existentes hoje migram para dentro de **Caixa**, integrando-se ao fluxo de movimentações.

## 1) Estrutura de arquivos

```text
src/
├── components/modules/
│   └── FinancialModule.tsx        ← vira shell com <Tabs>
├── components/financial/
│   ├── CaixaTab.tsx
│   ├── ReportTab.tsx
│   ├── NewExpenseSheet.tsx
│   ├── NewIncomeDialog.tsx        ← entrada manual (novo, vs spec)
│   ├── RegisterEntryDialog.tsx    ← lançamento de despesa
│   └── MovementDetailsSheet.tsx
└── lib/cash/
    └── cashStore.tsx              ← CashProvider (despesas + lançamentos + entradas manuais)
```

`CashProvider` é montado em `src/routes/index.tsx` junto aos demais stores. Estado em memória (mock), seguindo padrão dos outros módulos. `formatBRL`/`formatDateShort` já existem em `src/lib/mock/data.ts`; adiciono `formatDateTimeBR` lá mesmo.

## 2) Modelos de dados

```ts
type ExpenseRecurrence = "avulsa" | "mensal";

type Expense = {
  id; description; category; amount;
  recurrence: ExpenseRecurrence;
  dueDay?: number; notes?: string; createdAt: string;
};

type ExpenseEntry = {
  id; expenseId; description; category;
  amount; paidAt: string; notes?: string;
};

// NOVO em relação à spec — suporta a escolha "Lançamentos manuais de entrada também"
type ManualIncome = {
  id; description;
  source: string;          // ex.: "Bônus seguradora", "Reembolso"
  amount; receivedAt: string; notes?: string;
};
```

## 3) Fonte de **entradas** (composta)

A linha unificada de movimentações = união de **3 fontes**:

1. **Comissões pagas** — `commissions.filter(c => c.status === "pago")`. `date = c.dueDate`, `description = "Comissão · {clientName} · {insurer}"`, `amount = c.amount`. Origem read-only do mock atual.
2. **Entradas manuais** — `ManualIncome[]` do `CashContext`. Criadas via novo `NewIncomeDialog` (botão "Nova entrada" ao lado de "Nova despesa").
3. **Saídas** — `ExpenseEntry[]` do `CashContext`.

`MovementRow.details` continua sendo discriminated union: `comissao | manual | saida`, cada uma com o payload adequado para o `MovementDetailsSheet`.

## 4) `CaixaTab` — estrutura visual

```text
┌─ KPIs (4 cards, mantidos do Financeiro atual) ───────────────┐
│ Comissões a Receber │ Recebido no Mês │ Inadimplência │ Ticket Médio │
└──────────────────────────────────────────────────────────────┘
┌─ Resumo do mês (3 cards, novos da spec) ─────────────────────┐
│   Entradas (success)  │  Saídas (destructive)  │  Saldo (cond.)│
└──────────────────────────────────────────────────────────────┘
┌─ Despesas cadastradas ───────────────────────────────────────┐
│ [+ Nova despesa]  filtro por mês compartilhado abaixo        │
│ • lista com badges de categoria + recorrência + ações        │
└──────────────────────────────────────────────────────────────┘
┌─ Movimentações ──────────────────────────────────────────────┐
│ Header: título + Select(mês) + [+ Nova entrada]              │
│ Tabela: Data/Hora | Tipo | Descrição | Valor                 │
│ Pill Tipo: entrada=success, saída=destructive                │
│ Click → MovementDetailsSheet                                 │
└──────────────────────────────────────────────────────────────┘
┌─ Comissões (tabela existente preservada) ────────────────────┐
└──────────────────────────────────────────────────────────────┘
```

Regras-chave preservadas da spec:
- Filtro de mês único controla seção "Despesas cadastradas", "Movimentações" e os cards de Resumo do mês.
- Despesas **mensais** aparecem do mês de criação em diante; **avulsas** só no mês criado.
- `registerExpenseEntry` faz auto-ajuste do `amount` da despesa quando o valor pago difere.
- Ordenação das movimentações: `date` desc.

## 5) `ReportTab` — 4 gráficos (recharts, já no projeto)

Grid responsivo `grid-cols-1 lg:grid-cols-2 gap-4`:

1. **Fluxo de Caixa mensal** (LineChart, full-width no topo) — 12 meses; séries Entradas, Saídas e Saldo derivadas das movimentações do `CashContext` + comissões pagas.
2. **Receita vs Comissões** (LineChart) — migra o gráfico que hoje está em `FinancialModule.tsx`.
3. **Saídas por categoria** (PieChart/donut) — agrega `ExpenseEntry` do mês selecionado por `category`. Inclui Select de mês local à aba. Empty state quando não há saídas.
4. **Top clientes / seguradoras por receita** (BarChart horizontal) — agrega `commissions` (todos os status, com legenda explicando) por `clientName` e por `insurer` em duas tabs internas (`Tabs` aninhado pequeno) ou toggle.

Sem novas dependências (recharts já instalado).

## 6) Componentes de formulário

- **`NewExpenseSheet`** — `react-hook-form` + `zod` (já no projeto via shadcn). Campos: `description`, `category`, `amount > 0`, `recurrence` (RadioGroup), `dueDay` 1–31 (condicional), `notes`. Toast `sonner` no submit.
- **`RegisterEntryDialog`** — `amount` default = `expense.amount`, `paidAt` datetime-local default = agora, `notes`.
- **`NewIncomeDialog`** *(novo)* — mesma stack; `description`, `source`, `amount`, `receivedAt`, `notes`.
- **`MovementDetailsSheet`** — render condicional pelas 3 variantes (`comissao | manual | saida`), com link para a despesa-mãe quando saída.

## 7) Tokens e design

Usa tokens semânticos já existentes (`bg-card`, `text-success`, `text-destructive`, `bg-success/15`, `bg-destructive/15`, `text-muted-foreground`, `border-border`, `rounded-2xl`, `shadow-none`). O "botão pílula com gradient" da spec é substituído pelo `Button` padrão do projeto (variante `default` + classes utilitárias), mantendo coesão visual com os outros módulos (Tarefas, Portfólio, etc.). Sem cores hardcoded.

## 8) Sugestões adicionais (sinaliza, não implementa salvo confirmação)

- **Persistência**: hoje todos os stores são em memória; quando ativarmos Lovable Cloud, `cashStore` é candidato natural a virar tabelas `expenses`, `expense_entries`, `manual_incomes` com RLS por `user_id`.
- **Exportar CSV** das movimentações do mês (botão discreto no header da tabela).
- **Categorias sugeridas** pré-cadastradas (Aluguel, Software, Marketing, Impostos) em um Combobox com criação livre, evitando typos que quebram o gráfico de pizza.
- **Indicador de mês comparativo** nos cards de Resumo (▲/▼ vs mês anterior).

Posso incluí-las nesta entrega se quiser — diga quais entram.

## 9) Fora de escopo

- Edição de despesa mensal (a spec original também não cobre — só excluir e recriar).
- Conciliação bancária / integração com OFX.
- Permissões por cargo (Administrador/Vendedor) — herda do roteamento atual.
