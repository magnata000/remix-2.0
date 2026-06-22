# Centralizar comissões em Movimentações

## Objetivo
A tabela **Movimentações** (Financeiro > Caixa) passa a ser o único lugar onde se vê movimento financeiro. Toda comissão aparece ali com seu status (pago/pendente/atrasado) e o status é editável clicando no badge — mesmo padrão usado hoje na Carteira. A tabela "Comissões" duplicada é removida.

## Mudanças visíveis

### 1. Tabela Movimentações ganha coluna Status
Nova ordem de colunas: **Data/Hora · Tipo · Descrição · Status · Valor**.

- Status fica imediatamente à esquerda de Valor (mantém Valor na borda direita, alinhamento numérico limpo).
- Apenas linhas de comissão exibem o badge (`pago` verde / `pendente` amarelo / `atrasado` vermelho).
- Saídas e entradas manuais exibem `—` na célula.

### 2. Comissões — todas aparecem, não só as pagas
Hoje só comissões `pago` viram movimentação. Passamos a listar **todas** as comissões (pago, pendente, atrasado) como linhas de "Entrada" na tabela Movimentações, filtradas pelo mês selecionado usando `dueDate`.

- **Resumo do mês (KPI Entradas/Saldo)**: continua contando apenas comissões com status `pago` — pendente/atrasado não entram no saldo realizado.
- Visualmente a linha de comissão pendente/atrasada aparece, mas o valor não soma no KPI (apenas as pagas somam).

### 3. Badge de status clicável (replicar padrão da Carteira)
Clicar no badge de status em uma linha de comissão abre um `DropdownMenu` com as três opções (pago / pendente / atrasado), igual ao que existe em PoliciesTab.

Regras de transição:
- **pendente/atrasado → pago**: gera automaticamente a entrada no caixa do mês corrente (já é o comportamento implícito hoje quando `status === "pago"`).
- **pago → pendente/atrasado**: reverte a entrada (a comissão deixa de contar como entrada realizada no KPI e a linha continua visível, mas com novo status).
- Toast confirmando a mudança.
- O clique no badge **não** abre o `MovementDetailsSheet` (stopPropagation).

### 4. Remover a tabela "Comissões" separada
O Card "Comissões" abaixo de Movimentações é removido. Toda a informação agora vive na tabela centralizada.

## Detalhes técnicos

### Store de comissões (`src/lib/financial/commissionStore.tsx`)
Já estava planejado para a próxima etapa — antecipamos a criação porque precisamos de um único lugar com `updateCommissionStatus(id, newStatus)`.

- Provider no root, seed a partir de `commissions` do mock.
- Métodos: `addCommissionFromPolicy(policy)` (próxima etapa), `updateCommissionStatus(id, status)`.
- `CaixaTab` e `ReportTab` passam a ler de `useCommissionStore()` em vez do mock estático.

### CaixaTab.tsx
- Import de `commissions` removido, troca por `useCommissionStore()`.
- `movements` agora inclui **todas** as comissões (não só `pago`), cada uma carregando `commission` em `details` para o badge clicável.
- `summary.income` filtra `movements` somando apenas: entradas manuais + comissões cujo `commission.status === "pago"`.
- Nova coluna Status na `<Table>` com `<CommissionStatusMenu commission={...} />` para linhas de comissão e `—` para o resto.
- Card "Comissões" inteiro removido (junto com `statusColor` se não for mais usado em outro lugar do arquivo).

### Componente novo: `CommissionStatusMenu`
Pequeno componente local (ou em `src/components/financial/`) que renderiza o `Badge` dentro de um `DropdownMenu`, espelhando o padrão já existente em `PoliciesTab` para status de apólice. Chama `updateCommissionStatus` no store e dispara toast.

### Fora de escopo desta etapa
- Geração automática de comissão ao criar/renovar apólice (próxima etapa, já discutida).
- Permitir status para saídas/entradas manuais.
- Edição/exclusão de comissão pela UI.
- Mudança de regras nos KPIs do `ReportTab` (continua lendo do mesmo store).
