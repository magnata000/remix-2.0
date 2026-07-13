Remover a flag de imposto ("Paga comissão líquida" + campo "Taxa de imposto") da sub-aba Comissionamento em Configurações, para todos os produtos (Seguros, Saúde, Consórcio).

## Mudanças

**`src/components/settings/CommissionConfigSection.tsx`**
1. Remover o bloco JSX do toggle "Paga comissão líquida" e o campo condicional "Taxa de imposto (%)" (linhas 172–189).
2. Remover a validação `local.taxaImposto < 0 || local.taxaImposto > 1` do `save()` (linhas 106–109).
3. Remover o import de `Switch` se deixar de ser usado no arquivo (verificar após remoção).

## Fora do escopo

- Stores (`commissionConfigStore`), engine (`commissionEngine`) e tipos permanecem intactos — os campos `comissaoLiquida`/`taxaImposto` continuam no modelo, apenas não são mais editáveis por essa UI. As seguradoras manterão o valor atual do seed.
- Nenhuma alteração em `PolicyTaxOverrideFields`, dialogs de apólice, ou cálculos financeiros.