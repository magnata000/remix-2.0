## Objetivo

Tornar visíveis no Relatório as comissões **Canceladas** e **Devolvidas**, hoje ignoradas, e refletir devoluções no DRE.

## 1. `reportMetrics.ts` — nova função `revenueLosses`

```ts
export type RevenueLosses = {
  canceladas: { valor: number; parcelas: number; clientes: number };
  devolvidas: { valor: number; parcelas: number; clientes: number };
  serieMensal: Array<{ month: string; canceladas: number; devolvidas: number }>;
};
export function revenueLosses(commissions: Commission[], r: DateRange): RevenueLosses
```

- **Canceladas**: filtra `status === "cancelada"` por `dueDate` dentro de `r`.
- **Devolvidas**: filtra `status === "devolvido"` por `refundedAt` dentro de `r`.
- Série mensal cobre os meses do `range` selecionado (usa `monthlySeries` como referência), somando cada status pelo seu eixo temporal próprio.

### Ajuste no DRE (`computeDre`)

- Nova linha **Devoluções** entre Receita Bruta e Receita Líquida:
  - `devolucoes = commissions.filter(status === "devolvido" && inRange(refundedAt, r)).sum(amount)`
  - `receitaLiquida = receitaBruta - devolucoes - impostosReceita`
- Adicionar `devolucoes: number` em `DreResult`.

## 2. `DreTable.tsx`

- Renderizar a linha "(−) Devoluções" logo abaixo de Receita Bruta, antes de Impostos sobre Receita.

## 3. `ReportTab.tsx` — novo card "Perdas de Receita"

Inserido logo **após** o card Inadimplência (blocos separados; Inadimplência permanece intacta).

Layout espelhando o padrão de Inadimplência:

- **4 KPIs** (usando `KpiCard`):
  - Total Cancelado (valor R$)
  - Total Devolvido (valor R$)
  - Parcelas Canceladas (contagem)
  - Parcelas Devolvidas (contagem)
- Ambos KPIs de valor usam `invertTrendColor` (aumento é ruim), comparando com `prevR`.
- **Gráfico mensal**: `BarChart` empilhado com duas séries — `canceladas` (cor `--warning`) e `devolvidas` (cor `--destructive`), radius topo 6px.
- Título: "Perdas de Receita" · subtítulo: "Comissões canceladas (por vencimento) e devolvidas (por data de estorno) no período".
- `EmptyState` quando ambas as séries somam zero.

## 4. Hint do KPI "Receita Líquida"

Atualizar para: "Receita Bruta menos devoluções e impostos sobre receita lançados no período."

## Arquivos afetados

- `src/lib/financial/reportMetrics.ts` — nova `revenueLosses`, ajuste em `computeDre` (linha devoluções).
- `src/components/financial/DreTable.tsx` — nova linha.
- `src/components/financial/ReportTab.tsx` — novo card + memo `losses` e `lossesPrev` para deltas.

## Fora de escopo

- Nenhuma mudança em `CaixaTab`, formulários, `cashStore` ou `commissionStore`.
- Card de Inadimplência permanece como está.
