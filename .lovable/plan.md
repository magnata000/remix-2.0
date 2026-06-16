# Timeline nos cards de Pipeline de Vendas

Replicar nos cards de **Pipeline de Vendas** (aba "Pipeline" da página Quadro) o mesmo recurso de **Timeline** que já existe nos cards de **Tarefas**: clicar no card abre um diálogo de detalhes com timeline cronológica, comentários (com @menções, edição e exclusão dentro de 24h) e anexos.

## Escopo do que será replicado (idêntico ao das Tarefas)

- Eventos de timeline: `created`, `moved` (mudança de etapa), `comment`, `attachment`.
- Painel "Timeline" com auto-scroll para o final ao abrir.
- Composer com `MentionInput`, drag-and-drop de arquivos, envio com Enter, chips de pendentes.
- Comentários: edição em até 24h, exclusão (que também limpa o evento da timeline e seus anexos vinculados), badge "editada por X".
- Anexos: clique abre em nova aba; chip com nome/tamanho/ícone.
- Eventos `moved` registram nome da etapa origem → destino (Lead, Cotação, Negociação, Fechado, Perdido). Motivo de Perda continua exibido no rodapé do card (como hoje); não vira evento novo de timeline para não duplicar UX.

## Mudanças

### `src/lib/mock/data.ts`
- Adicionar campos opcionais ao tipo `Task` (Oportunidade): `comments?: TaskComment[]`, `attachments?: TaskAttachment[]`, `timeline?: TimelineEvent[]`, `createdAt?: string`. Reaproveitar tipos do taskStore via re-export (ou mover para `src/lib/shared/timeline.ts` — decidir na implementação; preferência por reaproveitar os tipos já exportados de `taskStore`).

### `src/lib/pipeline/opportunityStore.ts`
- Inicializar cada oportunidade do seed com `comments: []`, `attachments: []`, `timeline: [{ kind: "created", at, by: currentUserId }]`, `createdAt`.
- `moveStage`: além de mudar `stage`, adicionar evento `{ kind: "moved", from: stageLabels[antigo], to: stageLabels[novo], at, by }`.
- `createOpportunity` / `createFromQuote`: inicializar `timeline` com `created`.
- Novas ações (espelhando taskStore):
  - `addMessage(id, text, files)` — adiciona comentário + anexos + evento `comment`.
  - `editComment(id, commentId, text)` — só autor, marca `editedAt/editedBy`.
  - `deleteComment(id, commentId)` — só autor; remove comentário, anexos vinculados e evento de timeline.
  - `removeCommentAttachment(id, commentId, attachmentId)`.
  - `addAttachment(id, file)` — evento `attachment`.
  - `currentUserId` exposto pelo contexto.

### Novo: `src/components/pipeline/OpportunityDetailDialog.tsx`
- Cópia funcional do `TaskDetailDialog`, adaptada ao tipo `Opportunity`:
  - Sidebar exibe: Etapa (com cor da `stages` do KanbanModule), Responsável (avatar com `task.assignee`), Prazo (`dueDate`), Cliente, Ramo, Valor estimado, vínculo de cotação (link "Abrir no Multicálculo" se houver `quoteGroupId`).
  - Para Perdido, exibe motivo + nota abaixo da meta.
  - Mesma seção Timeline + composer do TaskDetailDialog.
- Para evitar duplicação maior, **extrair em `src/components/shared/Timeline.tsx`** os helpers visuais já existentes hoje em `TaskDetailDialog`: `TimelineRow`, `CommentBubble`, `PendingChip`, `AttachmentChip`, `formatTime`, `formatBytes`, `isImage`, `initialsOf`, `nameOf`, `EDIT_WINDOW_MS`. `TaskDetailDialog` passa a importar daí; `OpportunityDetailDialog` também.

### `src/components/modules/KanbanModule.tsx`
- Estado `selectedOpp` + clique no card (desktop e mobile) abre `OpportunityDetailDialog`.
- O clique não pode interferir com drag — usar `onClick` no wrapper; drag continua via `draggable` + `onDragStart`. Cliques em controles internos (menu "...", botão de cotação) param propagação.
- Botão `MoreHorizontal` ganha item "Abrir detalhes" no topo do `DropdownMenu` (acessibilidade/mobile).

## Fora do escopo

- Não muda o sistema de Tarefas: comportamento idêntico ao atual.
- Não cria nova entidade — usa os mesmos tipos do taskStore para timeline/comentários/anexos.
- Não persiste em backend (mantém em memória, como o restante do mock).
- Mudança de motivo de Perda continua via `LostReasonDialog` (não vira evento separado na timeline).
