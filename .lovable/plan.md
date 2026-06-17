
## Análise da redundância

Sim, os dois indicadores se sobrepõem na prática:
- **"Recebido no Mês"** (KPI antigo): soma de todas as comissões com status `pago` (na verdade é acumulado, mas com o rótulo "no Mês").
- **"Entradas · {mês}"** (card de Resumo do mês): soma de Comissões pagas + Entradas manuais do mês selecionado — é a métrica correta e filtrável.

O card "Entradas" do Resumo do Mês cumpre o mesmo papel de forma mais precisa, então remover o KPI evita duplicidade.

## Mudanças

### 1. `src/components/financial/CaixaTab.tsx`
- Remover o KPI **"Recebido no Mês"** do array `kpis`.
- Remover também os outros 3 KPIs (**Comissões a Receber**, **Inadimplência**, **Ticket Médio**) e todo o bloco `<div className="grid ... xl:grid-cols-4">` que renderiza os KPIs.
- Limpar imports não utilizados (`Wallet`, `Clock`, `AlertCircle`, `BarChart3`) e a constante `kpis` + cálculos `totalCom`, `pagoCom`, `pendenteCom`, `atrasadoCom` que ficam órfãos.
- A aba Caixa passa a iniciar diretamente pelo bloco **Resumo do mês** (Entradas / Saídas / Saldo).

### 2. `src/components/financial/ReportTab.tsx`
- Adicionar no topo da página um grid de **3 KPIs** (`sm:grid-cols-3`), com o mesmo visual usado hoje na Caixa (Card arredondado, ícone em círculo colorido):
  - **Comissões a Receber** → `pendenteCom` · ícone `Clock` · cor `warning` · highlight com `bg-brand/15`
  - **Inadimplência** → `atrasadoCom` · ícone `AlertCircle` · cor `destructive`
  - **Ticket Médio** → `totalCom / commissions.length` · ícone `BarChart3` · cor `brand`
- Cálculos derivados de `commissions` (mock) — independem do mês selecionado, como hoje.
- Renderizado **antes** do card "Fluxo de Caixa Mensal".

Nenhuma alteração em store, tipos ou rotas. Apenas reorganização de UI.
