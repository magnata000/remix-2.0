## Objetivo

Adicionar uma **seção dedicada de Impostos** na aba Caixa, distinta das despesas. Impostos alimentam suas próprias linhas do DRE (Impostos sobre Receita e Impostos sobre Lucro), aparecem como saída nas Movimentações e substituem o cálculo por alíquota %.

## Modelo de dados (`src/lib/cash/cashStore.tsx`)

Novo tipo `TaxEntry`:

```ts
type TaxKind = "sobre_receita" | "sobre_lucro";
type TaxEntry = {
  id: string;
  kind: TaxKind;
  description: string;
  amount: number;
  competenceMonth: number;   // 0-11
  competenceYear: number;
  paidAt: string;            // ISO, data de saída do caixa
  notes?: string;
};
```

Adicionar ao store: `taxes: TaxEntry[]`, `addTax`, `removeTax`. Seeds mínimos (2–3 lançamentos de exemplo do mês atual).

## UI — aba Caixa (`CaixaTab.tsx`)

- Novo card **"Impostos"**, abaixo de "Despesas cadastradas", com botão "Novo imposto".
- Lista os `TaxEntry` do mês/ano selecionados (por **competência**), agrupados visualmente por tipo, com badge azul "Sobre Receita" / roxo "Sobre Lucro".
- Cada item: descrição, valor, "Competência: Jul/2026", "Pago em: 15/07/2026", botão remover.
- Novo componente `NewTaxSheet.tsx` (padrão do `NewExpenseSheet`): Tipo (Select), Descrição, Valor, Competência (mês/ano, default = mês selecionado), Pago em (date, default = hoje), Observações.

## Movimentações

- Incluir `TaxEntry` no `movements` como `kind: "saida"`, `date = paidAt`, descrição `"Imposto · <tipo> · <descrição>"`, badge "Imposto".
- `_sortIso` usa `paidAt`. Afeta o saldo de caixa normalmente.
- `MovementDetailsSheet` ganha um `details.kind = "imposto"` com os campos do TaxEntry.

## DRE (`reportMetrics.ts` + `ReportTab.tsx`)

- `computeDre` passa a receber `taxes: TaxEntry[]` e classifica **por competência** (competenceYear/Month dentro do `range`):
  - `impostosReceita` = soma de `TaxEntry` com `kind = "sobre_receita"` no período
  - `impostosLucro` = soma de `TaxEntry` com `kind = "sobre_lucro"` no período
- **Remover** parâmetros `taxOnRevenuePct` / `taxOnProfitPct` da assinatura de `computeDre` e do uso em `ReportTab`.
- `ReportTab`: hint da linha "Receita Líquida" passa a ser "Receita Bruta menos impostos sobre receita lançados no período" (sem %).

## Config (`dreConfigStore.tsx`)

- Remover `taxOnRevenuePct`, `taxOnProfitPct`, `DEFAULT_TAX_REVENUE`, `DEFAULT_TAX_PROFIT`, seus setters e o reset associado. Manter apenas `classify` / `categoryKind`.
- Remover qualquer UI de configuração de alíquotas ainda referenciada (a subseção "Alíquotas de impostos" em Settings já foi removida em turno anterior — apenas confirmar que não sobrou nada).

## Nova Despesa (`NewExpenseSheet.tsx`)

- **Não** adicionar "Imposto sobre Receita" / "Imposto sobre Lucro" ao Select de Categoria. Impostos só entram pela nova seção.

## Arquivos afetados

- `src/lib/cash/cashStore.tsx` — tipo TaxEntry, estado, actions, seeds
- `src/components/financial/NewTaxSheet.tsx` — **novo**
- `src/components/financial/CaixaTab.tsx` — card Impostos + integração em `movements`
- `src/components/financial/MovementDetailsSheet.tsx` — variante "imposto"
- `src/lib/financial/reportMetrics.ts` — soma por competência, remove params de alíquota
- `src/components/financial/ReportTab.tsx` — atualiza chamada e hint
- `src/lib/financial/dreConfigStore.tsx` — remove alíquotas
- `src/routes/index.tsx` — remove referências a `taxOnRevenuePct/taxOnProfitPct` se houver

## Fora de escopo

- Cálculo automático a partir de faturamento (usuário lança manualmente).
- Recorrência mensal de imposto (cada mês é um lançamento novo).
- Edição de imposto existente (apenas criar/remover, alinhado ao padrão de despesas).
