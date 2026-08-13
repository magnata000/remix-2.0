# Feature Follow-up na Carteira

## Objetivo
Criar uma central de follow-ups comerciais na página Carteira, acessível tanto como uma aba global quanto como histórico no Drawer de cada cliente, com integração leve à Daily (alertas) e ao Kanban (tarefas vinculadas).

## Requisitos resolvidos
- **Localização**: nova aba "Follow-ups" na Carteira + seção dentro do Drawer do cliente.
- **Modelo de dados**: data/hora, tipo de contato (ligação, e-mail, WhatsApp, reunião, videocall, nota), status (agendado, realizado, cancelado, adiado), anotações e resultado.
- **Integração**: alertas na Daily para follow-ups agendados para hoje/amanhã; opção de gerar tarefa no Kanban ao criar/editar follow-up.
- **Permissões**: totalmente colaborativo — todos os usuários veem/editam todos os follow-ups, sem filtro por responsável.

## Modelo de dados

```text
FollowUp {
  id: string
  clientId: string            // referência ao cliente
  clientName: string          // denormalizado para exibição rápida
  date: string (ISO date)     // data do follow-up
  time: string (HH:MM)       // hora opcional
  type: "ligacao" | "email" | "whatsapp" | "reuniao" | "videocall" | "nota"
  status: "agendado" | "realizado" | "cancelado" | "adiado"
  notes: string               // anotações / resultado
  createdTaskId?: string      // referência a tarefa do Kanban, se houver
  createdAt: string
  updatedAt: string
}
```

## Escopo de implementação

### 1. Tipos e mock data
- Adicionar `FollowUp` e `FollowUpType` / `FollowUpStatus` ao `src/lib/mock/data.ts`.
- Criar seed de follow-ups para clientes sortidos, com datas variadas (hoje, amanhã, passado e futuro).

### 2. Store de follow-ups
- Criar `src/lib/portfolio/followUpStore.tsx` com:
  - `followUps: FollowUp[]`
  - `addFollowUp(input)`
  - `updateFollowUp(id, patch)`
  - `deleteFollowUp(id)`
  - `listByClient(clientId)`
  - `listByDateRange(start, end)`
  - `listTodayAndTomorrow()`
  - `changeStatus(id, status)`
- Adicionar `FollowUpStoreProvider` na árvore de providers em `src/routes/index.tsx`.

### 3. Aba "Follow-ups" na Carteira
- Em `src/components/modules/PortfolioModule.tsx`, adicionar terceira aba "Follow-ups" com contador.
- Criar `src/components/portfolio/FollowUpsTab.tsx` com:
  - Filtros: cliente, tipo de contato, status, período.
  - Busca por nome do cliente ou notas.
  - Listagem em cards (mobile) e tabela (desktop), agrupada por data.
  - Botão "Novo follow-up".
  - Ações rápidas: marcar como realizado, adiar, editar, excluir.

### 4. Seção no Drawer do cliente
- Em `src/components/portfolio/ClientDetailDrawer.tsx`, adicionar terceira aba "Follow-ups".
- Listar histórico de follow-ups do cliente com ordenação cronológica inversa.
- Botão "Novo follow-up".
- Timeline visual com tipo de contato, status, data e notas.

### 5. Dialog de follow-up
- Criar `src/components/portfolio/NewFollowUpDialog.tsx` e `EditFollowUpDialog.tsx` (ou um componente unificado `FollowUpDialog`).
- Campos: cliente (select, pré-preenchido quando aberto do Drawer), data, hora, tipo de contato, status, anotações.
- Checkbox "Criar tarefa no Kanban" — quando marcado, dispara `addTask` no `taskStore` com título automático e vincula o `createdTaskId`.
- Status padrão ao criar: "agendado".

### 6. Integração com a Daily
- Em `src/components/modules/DailyModule.tsx`, adicionar seção "Follow-ups agendados".
- Listar follow-ups de hoje e amanhã, ordenados por data/hora.
- Exibir tipo de contato, cliente e notas resumidas.
- Ação rápida "Marcar realizado".
- Não exige filtro por usuário, pois a premissa é colaborativa.

### 7. Integração com Kanban
- Ao criar follow-up com checkbox "Criar tarefa no Kanban", gerar uma tarefa no `taskStore` com:
  - `title`: "Follow-up: <cliente>"
  - `clientName`: nome do cliente
  - `dueDate`: data do follow-up
  - `stage`: "lead"
  - `branch`: derivado da primeira apólice ativa do cliente, ou "Auto" como padrão
  - `assignee`: vazio ou "EU"
- Guardar `createdTaskId` no follow-up para referência cruzada.

### 8. Testes e qualidade
- Adicionar testes unitários para a store de follow-ups (`followUpStore.test.ts`) cobrindo:
  - criação, edição, exclusão;
  - listagem por cliente;
  - listagem por data;
  - mudança de status.
- Validar regras de negócio e persistência em memória (mesmo padrão de outras stores).

## Mudanças em arquivos existentes
- `src/lib/mock/data.ts`
- `src/lib/portfolio/followUpStore.tsx` (novo)
- `src/components/modules/PortfolioModule.tsx`
- `src/components/portfolio/ClientsTab.tsx` (renomear se necessário, apenas para clareza)
- `src/components/portfolio/ClientDetailDrawer.tsx`
- `src/components/modules/DailyModule.tsx`
- `src/routes/index.tsx` (adicionar provider)
- `src/lib/tasks/taskStore.tsx` (garantir que a tarefa possa ser criada a partir do follow-up)

## Fora de escopo
- Notificações push ou e-mail.
- Follow-ups recorrentes.
- RLS/perfil de responsável (premissa atual é colaborativo).
- Relatórios analíticos de follow-up (pode ser feito em fase posterior).

## Critérios de aceitação
1. A Carteira exibe a aba "Follow-ups" com contador correto.
2. O Drawer do cliente exibe histórico de follow-ups do cliente selecionado.
3. É possível criar, editar, excluir e alterar status de follow-ups.
4. A Daily exibe follow-ups agendados para hoje e amanhã.
5. Ao criar follow-up com a opção de tarefa, uma tarefa aparece no Kanban vinculada ao cliente.
6. A store possui cobertura de testes unitários.
