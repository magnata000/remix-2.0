## Ajustes na aba Caixa

### 1. Formulário "Nova despesa" (`NewExpenseSheet.tsx`)

- **Categoria**: virar `Select` (shadcn) com valores predefinidos: Aluguel, Software, Marketing, Impostos, Salários, Serviços, Infra, Viagens, Outros. Substitui o input livre + datalist atual.
- **Novo campo obrigatório "Classificação DRE"**: `Select` com duas opções — `Custo Operacional` e `Despesa Operacional`. Nota curta abaixo: "Usado para contabilizar no DRE".
- Ambos campos com validação obrigatória.
- `addExpense` passa a receber `dreKind: "custo_operacional" | "despesa_operacional"` — persistido no registro da despesa.

### 2. Modelo de dados (`cashStore.tsx`)

- `Expense` ganha campo `dreKind: CategoryKind` (`"custo_operacional" | "despesa_operacional"`).
- Seeds atualizados com valores plausíveis (Aluguel/Software = custo; Marketing = despesa).
- `classifyCategory` do `dreConfigStore` passa a preferir `expense.dreKind` quando presente (mantém heurística para dados antigos).

### 3. Lista "Despesas cadastradas" (`CaixaTab.tsx`)

Estado computado por card, no mês selecionado:

- **Pago (por mês)**: existe um `ExpenseEntry` daquela despesa cujo `paidAt` cai no mês/ano selecionado.
- **Vencido**: apenas para `recurrence === "mensal"`, quando o mês selecionado é o mês atual, `hoje.getDate() > dueDay` e não há entry pago no mês.
- **Pendente**: qualquer outra.

Visual:

- **Pago**: card com `opacity-60`, título com `line-through` suave, badge verde `Pago` (`bg-success/15 text-success`), ícone de check. Botão "Registrar pagamento" oculto.
- **Vencido**: card com borda `border-destructive/40` + `bg-destructive/5`, badge vermelha `Vencido`, ícone de alerta discreto.
- **Pendente**: visual atual.

Ordenação: Vencidas → Pendentes → Pagas. Dentro de cada grupo, mantém ordem de criação decrescente.

Botão excluir e valor base permanecem em todos os estados. Ao registrar pagamento de mensal, o card se move automaticamente para o final (via re-render sobre o estado calculado).

### Arquivos afetados

- `src/lib/cash/cashStore.tsx` — adicionar `dreKind` em `Expense` e seeds.
- `src/lib/financial/dreConfigStore.tsx` — `classify` respeita `expense.dreKind` (adicionar overload/helper).
- `src/components/financial/NewExpenseSheet.tsx` — Categoria vira Select + novo Select "Classificação DRE".
- `src/components/financial/CaixaTab.tsx` — cálculo de status por card, badges, estilos e ordenação.
- `src/lib/financial/reportMetrics.ts` — usar `expense.dreKind` como fonte primária ao classificar entries no DRE.

### Fora do escopo (para próximo ciclo)

- Configuração global de categorias no Settings (Custo vs Despesa) — já não é necessária, pois a classificação vira responsabilidade do próprio registro.
