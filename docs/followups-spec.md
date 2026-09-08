# Spec — Aba Follow-ups (Carteira)

Documento de referência para recriar a feature de Follow-ups em outro projeto: modelo de dados, banco, camada de acesso, store, telas e regras de negócio.

---

## 1. Visão geral

Follow-ups são registros de contato comercial/relacionamento com um cliente da carteira (ligação, e-mail, WhatsApp, reunião, videocall ou nota interna), com data, hora opcional, status e anotações.

A feature aparece em três lugares:

1. **Aba "Follow-ups"** na página Carteira (lista global com filtros).
2. **Aba "Follow-ups"** dentro do Drawer de detalhe do cliente (histórico daquele cliente).
3. **Seção na Daily** com os follow-ups agendados para hoje/amanhã.

Opcionalmente, ao criar um follow-up agendado, é possível gerar uma **tarefa vinculada no Kanban**.

---

## 2. Modelo de dados (aplicação)

```ts
export type FollowUpType =
  | "ligacao" | "email" | "whatsapp" | "reuniao" | "videocall" | "nota";

export type FollowUpStatus = "agendado" | "realizado" | "cancelado" | "adiado";

export type FollowUp = {
  id: string;
  clientId: string;
  clientName: string;   // derivado do join com clients
  date: string;         // ISO date (YYYY-MM-DD)
  time?: string;        // HH:MM
  type: FollowUpType;
  status: FollowUpStatus;
  notes: string;        // anotações / resultado
  createdTaskId?: string; // tarefa do Kanban vinculada
  createdAt: string;
  updatedAt: string;
};

type FollowUpInput = Omit<FollowUp, "id" | "createdAt" | "updatedAt">;
```

### Relacionamentos

```text
clients (1) ─── (N) follow_ups
tasks   (0..1) ── (0..N) follow_ups   via created_task_id
```

- `clientName` nunca é gravado: vem sempre de `clients(name)` no `select`.
- Excluir o cliente exclui seus follow-ups (`on delete cascade`).

---

## 3. Banco de dados (PostgreSQL / Supabase)

```sql
create type public.follow_up_type   as enum ('ligacao','email','whatsapp','reuniao','videocall','nota');
create type public.follow_up_status as enum ('agendado','realizado','cancelado','adiado');

create table public.follow_ups (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  date            date not null,
  time            text,                                   -- "HH:MM"
  type            public.follow_up_type   not null default 'ligacao',
  status          public.follow_up_status not null default 'agendado',
  notes           text not null default '',
  created_task_id uuid references public.tasks(id) on delete set null,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index follow_ups_client_id_idx on public.follow_ups (client_id);
create index follow_ups_date_idx      on public.follow_ups (date);

-- Data API precisa de GRANT explícito
grant select, insert, update, delete on public.follow_ups to authenticated;
grant all on public.follow_ups to service_role;

alter table public.follow_ups enable row level security;
```

### RLS

Visibilidade herdada do cliente: quem pode ver o cliente pode ver e escrever os follow-ups dele.

```sql
create policy "Read via client" on public.follow_ups
for select to authenticated
using (exists (
  select 1 from public.clients c
  where c.id = follow_ups.client_id
    and (c.assignee_id = auth.uid() or public.can_view_all(auth.uid()))
));

create policy "Write via client" on public.follow_ups
for all to authenticated
using (exists (
  select 1 from public.clients c
  where c.id = follow_ups.client_id
    and (c.assignee_id = auth.uid() or public.can_view_all(auth.uid()))
))
with_check (exists (
  select 1 from public.clients c
  where c.id = follow_ups.client_id
    and (c.assignee_id = auth.uid() or public.can_view_all(auth.uid()))
));
```

`can_view_all(uid)` é uma função `security definer` que retorna true para papéis `admin` e `pos_venda` (vendedor vê só a própria carteira). Papéis ficam em tabela separada (`user_roles`), nunca em `profiles`.

Trigger recomendado: `updated_at = now()` em cada `update`.

---

## 4. Camada de acesso (server functions)

Arquivo: `src/lib/portfolio/carteira.functions.ts`. Todas usam o middleware de autenticação e o client Supabase do usuário (RLS aplicada).

```ts
const FOLLOWUP_SELECT = "*, clients(name)";

listFollowUps()                          // GET, order by date desc
createFollowUp(input: FollowUpInput)     // POST → FollowUp
updateFollowUp({ id, patch })            // POST, patch parcial → FollowUp
deleteFollowUp({ id })                   // POST → { ok: true }
```

Mapeamento snake_case → camelCase em `mapFollowUp(row)`:
`client_id→clientId`, `clients.name→clientName`, `created_task_id→createdTaskId`, `time` nulo → `undefined`.

No `create`, `created_by` recebe o id do usuário autenticado.
No `update`, apenas as chaves presentes no `patch` são enviadas.

---

## 5. Store (`followUpStore.tsx`)

Context + TanStack Query, chave `["follow-ups"]`. Toda mutação invalida a query.

```ts
type Ctx = {
  followUps: FollowUp[];
  isLoading: boolean;
  addFollowUp(input): Promise<FollowUp>;
  updateFollowUp(id, patch): Promise<void>;
  deleteFollowUp(id): Promise<void>;
  changeStatus(id, status): Promise<void>;
  listByClient(clientId): FollowUp[];           // date desc
  listByDateRange(start, end): FollowUp[];      // date asc
  listTodayAndTomorrow(ref?): FollowUp[];       // só status "agendado", ordenado por hora
};
```

- `listTodayAndTomorrow` filtra `date ∈ {hoje, amanhã}` **e** `status === "agendado"`; ordena por `time` (sem hora = `23:59` no fim).
- Provider (`FollowUpStoreProvider`) fica na árvore de providers da área autenticada, depois do provider de clientes.
- Hook: `useFollowUps()` (lança erro fora do provider).

---

## 6. Tela — aba Follow-ups da Carteira

`FollowUpsTab.tsx`. Estrutura:

1. **Cabeçalho**: botão "Novo follow-up" alinhado à direita (rótulo escondido em mobile).
2. **Card de filtros**:
   - busca livre (cliente, tipo ou notas, case-insensitive);
   - select de cliente (`all` + lista de clientes);
   - select de tipo (`all` + 6 tipos);
   - select de status (`all` + 4 status);
   - período "De"/"Até" com calendário em popover;
   - "Limpar filtros" aparece somente quando há filtro ativo.
3. **Lista** ordenada por data desc e **agrupada por data**, com cabeçalho de grupo "Hoje" / "Amanhã" / data curta.
   - **Mobile**: cards com avatar do tipo, cliente, data/hora, badge de status, notas em 2 linhas e ações inline (Editar, Realizado, Excluir).
   - **Desktop**: tabela com colunas Data/Hora · Cliente · Tipo · Status · Anotações (truncado) · Ações (menu `⋯`).
4. **Estado vazio**: card centralizado com ícone, "Nenhum follow-up encontrado" e instrução para ajustar filtros.
5. **Dialog** compartilhado para criar/editar.

### Rótulos e cores

| Tipo | Rótulo (lista) | Rótulo (dialog) | Ícone |
| --- | --- | --- | --- |
| ligacao | Ligação | Ligação | Phone |
| email | E-mail | E-mail | Mail |
| whatsapp | WhatsApp | WhatsApp | MessageCircle |
| reuniao | Reunião | Reunião presencial | Users |
| videocall | Videocall | Videocall | MessageCircle |
| nota | Nota | Nota interna | MessageCircle |

| Status | Rótulo | Estilo do badge |
| --- | --- | --- |
| agendado | Agendado | `bg-info/15 text-info` |
| realizado | Realizado | `bg-success/15 text-success` |
| cancelado | Cancelado | `bg-muted text-muted-foreground` |
| adiado | Adiado | `bg-warning/15 text-warning` |

Menu de ações: Editar · Marcar realizado (oculto se já realizado) · Cancelar (oculto se já cancelado) · Excluir (destrutivo). Cada ação dispara toast de confirmação.

---

## 7. Dialog de follow-up (`FollowUpDialog.tsx`)

Componente único para criar e editar (`followUp` preenchido = modo edição). Aceita `defaultClient` para pré-selecionar e travar o cliente quando aberto pelo Drawer.

Campos: Cliente\* (select) · Data\* (calendário) · Hora (input `time`) · Tipo\* · Status\* · Anotações/Resultado (textarea) · checkbox "Criar tarefa no Kanban" (só na criação).

Validações: cliente obrigatório; data obrigatória; hora, se informada, deve casar `^([01]\d|2[0-3]):([0-5]\d)$`.

Reset ao abrir: em criação, data = hoje, tipo = `ligacao`, status = `agendado`, demais vazios.

### Tarefa vinculada no Kanban

Quando o checkbox está marcado **e** `status === "agendado"`:

```text
title       = "Follow-up: <nome do cliente>"
description = anotações
dueDate     = data do follow-up
priority    = "media"
assigneeId  = "" (colaborativo)
clientName  = nome do cliente
columnId    = coluna inicial do quadro
```

O id da tarefa criada é gravado em `createdTaskId`. Em edição, o valor anterior é preservado se nenhuma tarefa nova for criada.

---

## 8. Integração com o Drawer do cliente

`ClientDetailDrawer.tsx` ganha uma aba "Follow-ups" com contador. O painel:

- lista `listByClient(clientId)` (mais recentes primeiro) em formato de timeline;
- filtros locais por status e por tipo;
- botão "Novo follow-up" que abre o dialog com `defaultClient` travado;
- mesmas ações de editar / mudar status / excluir.

---

## 9. Integração com a Daily

Seção "Follow-ups" alimentada por `listTodayAndTomorrow()`:

- mostra tipo (ícone), cliente, data/hora e resumo das notas;
- ação rápida "Marcar realizado";
- link para a Carteira quando a lista está cheia;
- se vazia, a seção mostra estado neutro.

---

## 10. Contador na página Carteira

`PortfolioModule.tsx` renderiza três abas — Apólices, Clientes, Follow-ups — cada uma com contador entre parênteses (`followUps.length`).

---

## 11. Critérios de aceitação

1. A Carteira mostra a aba "Follow-ups" com contador correto.
2. É possível criar, editar, excluir e mudar o status de um follow-up, com persistência real (sobrevive a recarregar a página).
3. Filtros de cliente, tipo, status, período e busca funcionam combinados.
4. A lista é agrupada por data, com "Hoje" e "Amanhã" destacados.
5. O Drawer do cliente mostra apenas os follow-ups daquele cliente, com o cliente travado no dialog.
6. A Daily mostra os agendados de hoje e amanhã ordenados por hora.
7. Com o checkbox marcado, uma tarefa vinculada aparece no Kanban e `createdTaskId` é preenchido.
8. Um vendedor só vê follow-ups de clientes atribuídos a ele; admin e pós-venda veem todos.

---

## 12. Fora de escopo

- Notificações por push ou e-mail.
- Follow-ups recorrentes.
- Relatórios analíticos de follow-up.
- Anexos por follow-up.

---

## 13. Arquivos envolvidos

```text
src/lib/mock/data.ts                            tipos FollowUp / FollowUpType / FollowUpStatus
src/lib/portfolio/carteira.functions.ts         list/create/update/delete + mapFollowUp
src/lib/portfolio/followUpStore.tsx             context + TanStack Query + helpers
src/components/portfolio/FollowUpsTab.tsx       aba global
src/components/portfolio/FollowUpDialog.tsx     criar/editar
src/components/portfolio/ClientDetailDrawer.tsx aba no drawer do cliente
src/components/modules/PortfolioModule.tsx      registro da aba + contador
src/components/modules/DailyModule.tsx          seção hoje/amanhã
```
