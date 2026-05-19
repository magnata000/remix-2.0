## Objetivo
Permitir editar comentários da timeline dentro de 24h após a postagem, e exibir uma legenda sutil indicando "editada por (nome)" quando aplicável.

## Regras
- **Quem pode editar**: apenas o autor do comentário (`comment.authorId === currentUserId`) — autoria já existe.
- **Janela de edição**: 24h a partir de `createdAt`. Após esse prazo, o botão de editar desaparece.
- **Indicador "editada"**: após salvar, mostrar abaixo/ao lado do timestamp um texto sutil em `text-[10px] text-muted-foreground italic`, formato: `editada por {nome}`. Não exibir nada se nunca foi editada.
- **Sem histórico de versões**: armazenamos só o último estado.

## Mudanças técnicas

### 1. `src/lib/tasks/taskStore.tsx`
- Estender `TaskComment` com:
  - `editedAt?: string`
  - `editedBy?: string`
- Adicionar ação `editComment(taskId, commentId, text)` no `Ctx` que:
  - Atualiza `text`, `editedAt = now`, `editedBy = currentUserId`.
  - **Não** cria novo evento de timeline (a edição é uma propriedade do próprio comentário, mantendo a ordem original).
- Expor `editComment` no value do provider.

### 2. `src/components/tasks/TaskDetailDialog.tsx`
- No bloco `ev.kind === "comment"`, em vez de renderizar texto puro, montar um sub-componente `CommentBubble` com:
  - Conteúdo via `renderMentions(c.text)`.
  - Botão "Editar" sutil (ícone `Pencil` em `ghost` pequeno) — só visível se `c.authorId === currentUserId` **e** `Date.now() - new Date(c.createdAt).getTime() < 24*60*60*1000`.
  - Ao clicar: alterna para `MentionInput` controlado com o texto atual + botões "Salvar" / "Cancelar".
  - Salvar chama `editComment(task.id, c.id, newText)`; trim + ignora se inalterado/vazio.
  - Se `c.editedAt` existir, render abaixo do texto: `<span className="text-[10px] text-muted-foreground italic">editada por {nameOf(c.editedBy)}</span>`.
- Imports adicionais: `Pencil` de `lucide-react`.

## Fora de escopo
- Edição de outros tipos de evento (created/moved/attachment).
- Histórico de versões de edição.
- Permissão para admin editar comentário alheio.
