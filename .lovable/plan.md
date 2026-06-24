# Plano — Página Financeiro

## 1. Bug de data/hora nas Movimentações (comissões)

**Causa:** `Commission.dueDate` é `"YYYY-MM-DD"`. `new Date("2025-03-10")` é interpretado como UTC 00:00 → em BR (UTC-3) vira 09/03 21:00. Mostrar hora não faz sentido em comissões (não há hora real).

**Solução:**
- Tornar `Commission` opcional `paidAt?: string` (ISO completo). Quando `CommissionStatusMenu` muda status para "pago", grava `paidAt = new Date().toISOString()`.
- `MovementDetailsSheet` e coluna "Data/Hora" da tabela:
  - Comissão paga → exibir `formatDateTimeBR(paidAt)`.
  - Demais (pendente/atrasado/devolvido) → exibir só a data, usando parser local: `parseLocalISO("YYYY-MM-DD")` → `new Date(y, m-1, d)` (sem deslocamento de timezone).
- Adicionar helper `formatDateBR` em `cashStore.tsx` que usa o parser local. Reusar `formatDateShort` se equivalente.

## 2. Valores com 2 casas decimais

**Causa:** `formatBRL` usa `maximumFractionDigits: 0`; `generateCommissionSchedule` e `expectedRecurrencesUntil` arredondam com `Math.round`.

**Solução:**
- `formatBRL`: passar a usar `minimumFractionDigits: 2, maximumFractionDigits: 2`. Verificar uso em KPIs/Dashboard/Pipeline — atualmente todos exibem moeda; 2 casas é o padrão BR e não quebra nada visual.
- `commissionEngine.ts`: substituir `Math.round(value)` por `Math.round(value * 100) / 100` nas funções `applyTax`, agenciamento e recorrência. Mantém precisão em parcelas pequenas (ex: R$ 14,50).
- Sem mudança em valores já mockados (são inteiros e seguem renderizando como `X,00`).

## 3. Status "devolvido" + lógica de cancelamento de apólice

**Tipo:** `Commission.status` passa a aceitar `"pago" | "pendente" | "atrasado" | "devolvido" | "cancelada"`.
- `"devolvido"`: comissão que já tinha sido paga e teve de retornar à seguradora → conta como **saída** no caixa.
- `"cancelada"`: parcela futura que não vai mais ocorrer → some dos KPIs, fica visível na tabela com badge cinza, valor riscado.

**Gatilho:** quando uma `Policy` muda para `status === "cancelada"` (via `updatePolicy` em `policyStore`):
1. Para cada comissão da apólice (`scheduleOfPolicy(id)`):
   - `status === "pago"` → vira `"devolvido"`, grava `refundedAt = now()`.
   - `status in ("pendente","atrasado")` → vira `"cancelada"`.
   - `status in ("devolvido","cancelada")` → ignora (idempotente).
2. Emite toast: "X parcelas devolvidas · Y parcelas canceladas".

**UI — `CaixaTab` / tabela Movimentações:**
- Filtro Status ganha "Devolvido" e "Cancelada".
- `CommissionStatusMenu`: inclui as duas novas opções. "Devolvido" só selecionável a partir de "pago"; "Cancelada" só a partir de pendente/atrasado (regras enforced no menu, mas livres se forçado manualmente — usuário tem controle total, requisito da conciliação).
- Devolvido renderiza como **saída** (linha vermelha, ícone ↑) e entra em `summary.expense`; comissão cancelada não entra em nenhum total e aparece com classe `line-through text-muted-foreground`.
- `MovementDetailsSheet`: linha "Status" mostra novos badges; em "Devolvido", adiciona Row "Motivo: Cancelamento da apólice ANT-XXXX".

**Fora de escopo desta etapa:** pró-rata (devolução proporcional ao tempo restante). Hoje é tudo ou nada; documentamos como item futuro.

## 4. Nova aba **Repasses de vendedores**

Persistência: adicionar `assigneeId?: string` em `Policy` (UI já tem o campo "Vendedor" em `NewPolicyDialog`/`EditPolicyDialog`; hoje não é salvo no objeto). Propagar para `addPolicy`/`updatePolicy`.

**Novo store:** `src/lib/financial/sellerCommissionStore.tsx`
- `SellerCommissionRate { memberId: string; branch: Branch; pct: number }`
- Seed: para cada `TeamMember` com role `"Vendedor"`, gera entradas para cada `Branch` com `pct = 30` (default).
- API: `getRate(memberId, branch)`, `updateRate(...)`, `computeSellerPayout(commission, policy)` → `commission.amount * pct / 100` (só para comissões `status === "pago"`).

**Novo componente:** `src/components/financial/SellerCommissionsTab.tsx`
- **Bloco 1 — Configuração de %**: tabela `Vendedor × Ramo` editável (input de % por célula). Botão "Salvar".
- **Bloco 2 — Histórico por vendedor**: seletor de vendedor + seletor de mês. Lista todas as comissões pagas naquele mês cuja `policy.assigneeId === vendedor`, mostrando: data, cliente, apólice, ramo, valor comissão corretora, % aplicado, **valor repasse R$**. Total no rodapé.
- **Bloco 3 — KPI**: total a repassar no mês selecionado, agrupado por vendedor (cards).

**Wire-up:** `FinancialModule.tsx` ganha 3ª `TabsTrigger` "Repasses".

## 5. Conciliação de comissões (upload mensal manual)

Mantém **controle total do usuário** (requisito explícito). RPA real de scraping fica como roadmap; entregamos o fluxo de upload + reconciliação assistida que a RPA alimentaria.

**Onde:** dentro da aba Caixa, novo botão `"Conciliar mês"` no header da tabela Movimentações. Abre `ReconcileSheet`.

**Fluxo do Sheet:**
1. Seletor de seguradora + upload de planilha (`.csv`/`.xlsx`). Mock parseia em memória — sem backend. Schema esperado documentado no próprio sheet: `apolice, vencimento, valor`.
2. Sistema casa cada linha da planilha contra `commissions` filtrando por `insurer + mês`:
   - **Match exato** (apólice + valor) → marca para `status = "pago"`, `paidAt = data da planilha`.
   - **Match por apólice, valor divergente** → linha amarela, mostra ambos os valores, usuário decide: aceitar valor da seguradora / manter atual / marcar como devolvido.
   - **Na planilha mas não no sistema** → linha laranja, oferece "Criar entrada manual".
   - **No sistema mas não na planilha** → linha cinza, oferece "Marcar como atrasado" ou "Ignorar".
3. Resumo no rodapé (X matches, Y divergências, Z extras) + botão "Aplicar alterações".

**Persistência:** registra `ReconciliationRun { id, insurer, month, createdAt, summary }` em store local; visível em painel "Conciliações deste mês" abaixo do botão, com link para reabrir.

**Acionamento:** **manual** (todo mês o usuário clica). Não há agendamento automático nesta entrega.

## 6. Arquivos a tocar

```text
src/lib/mock/data.ts                          tipo Commission + Policy.assigneeId + status novos
src/lib/cash/cashStore.tsx                    helper formatDateBR (parser local)
src/lib/financial/commissionEngine.ts         2 casas decimais
src/lib/financial/commissionStore.tsx         paidAt, refundedAt, cascade on policy cancel
src/lib/financial/sellerCommissionStore.tsx   NEW
src/lib/portfolio/policyStore.tsx             observar transição p/ cancelada
src/components/financial/CommissionStatusMenu.tsx   novos status
src/components/financial/CaixaTab.tsx         filtros, devolvido como saída, botão Conciliar
src/components/financial/MovementDetailsSheet.tsx   exibição data/hora condicional
src/components/financial/SellerCommissionsTab.tsx   NEW
src/components/financial/ReconcileSheet.tsx        NEW
src/components/modules/FinancialModule.tsx    nova aba
src/components/portfolio/NewPolicyDialog.tsx  persistir assigneeId
src/components/portfolio/EditPolicyDialog.tsx persistir assigneeId
```

## Fora de escopo
- RPA real (scraping nos portais das seguradoras): documentar e adiar.
- Devolução pró-rata.
- Conciliação agendada/automática.
- Relatório fiscal de repasses (export contábil).
