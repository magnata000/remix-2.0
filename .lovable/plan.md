# Aba Tarefas — prévia no card, fixar mensagens e busca

Limite de caracteres adotado em todos os pontos de truncamento: **120 caracteres**.

## 1) Prévia da última mensagem no card

**`src/components/tasks/TaskCard.tsx`**
- Calcular `lastComment = task.comments[task.comments.length - 1]`.
- Renderizar abaixo do título/cliente um bloco compacto:
  - Avatar 4×4 do autor + nome curto (`nameOf`) em `text-[11px] text-muted-foreground`.
  - Texto da mensagem em `text-xs`, com `clamp` a 120 caracteres (`text.length > 120 ? text.slice(0,120).trimEnd() + "…" : text`).
  - Se a mensagem não tiver texto (só anexos), mostrar "📎 N anexo(s)".
- Manter contadores de comentários/anexos como hoje no rodapé do card.

## 2) Fixar até 3 mensagens na timeline

**`src/lib/tasks/taskStore.tsx`**
- Adicionar campo opcional `pinned?: boolean` em `TaskComment`.
- Novas ações no contexto: `togglePinComment(taskId, commentId)` — se for fixar, validar `pinned.length < 3`; se já são 3, ignorar (a UI exibe toast).
- Tipo `Ctx` atualizado e exposto.

**`src/components/tasks/TaskDetailDialog.tsx`**
- No topo da seção Timeline, antes do feed, renderizar uma sub-seção "📌 Fixadas (N/3)" com as mensagens fixadas (ordem por `createdAt`). Esconder a sub-seção quando vazia.
- Cada mensagem fixada usa o `CommentBubble` (reuso), com a mesma regra de expandir/recolher descrita abaixo.

**`src/components/shared/Timeline.tsx` — `CommentBubble`**
- Novas props: `pinned: boolean`, `canPin: boolean` (false quando já há 3 fixadas e essa não é fixada), `onTogglePin: () => void`.
- Botão de pin (ícone `Pin`/`PinOff` do lucide) ao lado do ícone de edição existente; visível no hover, sempre visível quando `pinned`. Quando `canPin === false` e não está fixada → botão desabilitado com tooltip "Limite de 3 mensagens fixadas".
- Quando `comment.text.length > 120` (independente de fixada ou não):
  - Estado local `expanded`.
  - Renderizar texto truncado em 120 chars + botão "setinha" (`ChevronDown` / `ChevronUp`) inline à direita, alternando expandir/recolher.
  - Quando expandido, mostra o texto completo.
- Texto curto (≤120) não exibe a setinha.

## 3) Busca por mensagens e documentos (lupa)

Aplicar nos dois locais (conforme escolha "Ambos"):

### 3a) Busca local — dentro do `TaskDetailDialog`
**`src/components/tasks/TaskDetailDialog.tsx`**
- Adicionar botão `Search` (ícone lupa, `ghost` `h-7 w-7`) ao lado do título "Timeline".
- Ao clicar, mostrar um `Input` compacto logo abaixo do título (toggle) com placeholder "Buscar mensagem ou documento…".
- Filtragem em memória: filtra `task.timeline` mantendo apenas eventos `comment` cujo texto contenha o termo (case-insensitive) e eventos `attachment` cujo `name` contenha o termo. Eventos `created`/`moved` são ocultados quando há busca ativa. Mensagens fixadas também são filtradas pelo termo.
- Botão `X` no input limpa a busca.

### 3b) Busca global — toolbar da aba Tarefas
**`src/components/tasks/TasksBoard.tsx`** (toolbar superior do quadro)
- Botão `Search` discreto à direita da toolbar, ao lado dos demais controles.
- Clique abre um `Popover` (ou expande um `Input` na própria toolbar) com `Command`/`Input` para digitar.
- Resultado: lista agrupada por tarefa, mostrando:
  - Título da tarefa + coluna.
  - Cada match (comentário truncado em 120 chars com termo destacado, ou nome do anexo com ícone).
- Clicar num resultado: abre o `TaskDetailDialog` da tarefa correspondente, já com o termo aplicado no filtro local (passar `initialSearch` via prop).

**Helper compartilhado** (novo arquivo `src/lib/tasks/searchTasks.ts`)
- `searchTasks(tasks, term)` → retorna `{ task, matches: Array<{ kind: "comment"|"attachment", id, snippet }> }[]`. Reutilizado pela toolbar.

## Detalhes técnicos

- Constante `MESSAGE_PREVIEW_LIMIT = 120` exportada de `src/lib/tasks/taskStore.tsx` e usada por `TaskCard`, `CommentBubble`, e nos snippets da busca global, para manter um único ponto de verdade.
- Ícones: `Pin`, `PinOff`, `ChevronDown`, `ChevronUp`, `Search`, `X` (todos `lucide-react`).
- Sem alterações de backend nem novas dependências. Estado `pinned` é client-side (vive no `TaskStoreProvider` em memória, como o resto do mock).

## Fora de escopo
- Persistência das fixações (some ao recarregar — coerente com o mock atual).
- Destaque visual avançado (highlight com `<mark>`) — manter snippet simples com truncamento.
- Busca em descrição/título da tarefa ou em outras abas.
