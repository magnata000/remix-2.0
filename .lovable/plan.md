## Objetivo

Substituir o `DashboardModule` atual por uma página **Daily**: central de notificações e alertas focada no dia a dia do colaborador logado. KPIs, gráfico de vendas, taxa de renovação e apólices recentes são removidos.

## Escopo por seção

Todas as seções operam sobre os stores existentes (`taskStore`, `clientStore`, `policyStore`, `teamStore`). "Usuário logado" = `me` do `teamStore` (mesmo padrão já usado em Tarefas). Quando o login real existir, basta trocar essa referência por uma central única — encapsulo o acesso num hook `useCurrentUserId()` para facilitar essa troca futura.

### 1. Minhas tarefas — próximos 3 dias (+ atrasadas)
- Filtro: `assigneeId === currentUserId`, `columnId !== "concluido"` (coluna de concluído do quadro), `dueDate` entre hoje e +3 dias **ou** vencida.
- Ordenação: atrasadas no topo (mais antigas primeiro) → depois por `dueDate` asc → desempate por `priority` (alta > media > baixa).
- Card mostra: título, cliente, prazo relativo ("Atrasada 2d", "Hoje", "Amanhã", "Em 3d"), badge de prioridade, SLA se houver.
- Clique abre `TaskDetailDialog` existente.

### 2. Menções em tarefas
- Origem: campo `description` das tarefas (o `MentionInput` já grava `@Nome`). Preciso resolver "Nome" → `teamMember.id` via `teamStore` e casar com `currentUserId`. Menções a "@Todos" também contam.
- Também considero menções em comentários (se o taskStore já os tiver; caso contrário, apenas description — verifico ao implementar).
- Mostra: quem mencionou (autor da task ou última edição — uso `assigneeId` como proxy inicial se não houver campo dedicado), trecho da descrição, link para a tarefa.
- Deduplico por task; ordeno pela `dueDate` (ou `createdAt` se existir) desc.

### 3. Aniversariantes do dia
- Clientes: `client.birthDate` com `MM-DD` == hoje.
- Beneficiários: percorro `policies[].beneficiaries[]` do ramo Saúde e comparo `MM-DD`.
- Card mostra: nome, idade que completa, tipo (Cliente / Beneficiário — Titular do cliente X), telefone/email quando disponível.

### 4. Apólices vencendo em 30 dias
- Filtro: `status === "ativa"` e `endDate` entre hoje e +30 dias.
- Ordenação: `endDate` asc.
- Card: número, cliente, ramo, seguradora, dias restantes, botão "Abrir apólice" (reaproveita drawer da Carteira via navegação).
- Não filtro por colaborador (é visão geral da corretora); marco no card se `assigneeId` bate com `currentUserId`.

### 5. Troca de faixa etária em 3 meses (Saúde)
- Faixas ANS padrão: `0-18, 19-23, 24-28, 29-33, 34-38, 39-43, 44-48, 49-53, 54-58, 59+`.
- Considero cliente titular **quando ele é beneficiário do plano de Saúde** e todos os `beneficiaries[]` do ramo Saúde.
- Para cada pessoa: computo idade hoje e idade em +90 dias; se cruzam limites de faixa diferentes, entra na lista.
- Card: nome, apólice, faixa atual → nova faixa, data prevista da troca. Ordeno por data asc.

## Arquivos

**Novos**
- `src/lib/daily/ageBands.ts` — constante `ANS_AGE_BANDS` + `getBand(age)` + `findBandChange(birthDate, withinDays)`.
- `src/lib/daily/dailyQueries.ts` — funções puras que recebem stores e retornam as 5 listas.
- `src/hooks/useCurrentUserId.ts` — hoje retorna `teamStore.me`; ponto único de troca quando houver login.
- `src/components/modules/DailyModule.tsx` — layout em grid com 5 cards/seções + estados vazios amigáveis.
- `src/components/daily/DailyTasksSection.tsx`
- `src/components/daily/DailyMentionsSection.tsx`
- `src/components/daily/DailyBirthdaysSection.tsx`
- `src/components/daily/DailyRenewalsSection.tsx`
- `src/components/daily/DailyAgeBandSection.tsx`

**Editados**
- `src/routes/index.tsx` — trocar `<DashboardModule />` por `<DailyModule />` no branch `active === "dashboard"` (mantenho a chave `"dashboard"` para não mexer em `ModuleKey`/roteamento).
- `src/components/shell/TopBar.tsx` — renomear label "Dashboard" → "Daily" (ícone opcional: `Bell` ou manter `LayoutDashboard`); a chave `"dashboard"` permanece.
- `src/components/modules/DashboardModule.tsx` — **preservado no repositório** (dead code, igual ao `RenewPolicyDialog`) para permitir volta rápida se necessário.

## Layout

```text
┌───────────────────────────────────────────────────────────┐
│ Daily — Bom dia, {nome}                     {data de hoje}│
├───────────────────────────────┬───────────────────────────┤
│ Minhas tarefas (3d + atrasos) │ Menções para mim          │
│ [rolagem interna]              │ [rolagem interna]         │
├───────────────────────────────┼───────────────────────────┤
│ Aniversariantes do dia         │ Apólices vencendo (30d)  │
├───────────────────────────────┴───────────────────────────┤
│ Troca de faixa etária — próximos 3 meses (Saúde)          │
└───────────────────────────────────────────────────────────┘
```

Cada seção com contador no header, empty state (“Sem tarefas para os próximos dias 🎉” etc.) e limite visual (mostrar 5–8, com "ver todas" que expande — ou remove se preferir tudo aberto).

## Fora de escopo
- Notificações push/toasts em tempo real (a Daily é a página; sino do TopBar segue como está).
- Configuração de faixas ANS em Ajustes (uso constante; migro para configurável se pedir depois).
- Preservar KPIs/gráficos (removidos da tela, arquivo antigo fica no repo).
- Integração com login real — deixo o hook `useCurrentUserId` isolado para trocar em uma linha.

## Riscos
- Menções: se o `taskStore` não tiver histórico/comentários, só detecto `@Nome` no `description`. Confirmo ao implementar; se necessário, viro só "tarefas em que sou mencionado" (assignee ≠ eu mas meu nome aparece na descrição).
- Aniversariantes/faixa etária dependem de `birthDate` populado nos mocks; adiciono fallback silencioso quando ausente.
