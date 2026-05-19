## Objetivo
Habilitar arrastar e soltar arquivos diretamente na caixa de comentário, com pré-visualização e envio único (texto + anexos numa só mensagem). Permitir, na edição, remover anexos individuais e excluir a mensagem quando restar apenas um anexo sem texto.

## Modelo de dados (`src/lib/tasks/taskStore.tsx`)

### `TaskComment` ganha vínculo com anexos
```ts
export type TaskComment = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  editedAt?: string;
  editedBy?: string;
  attachmentIds?: string[]; // novo
};
```

### Novas/ajustadas ações no contexto
- `addMessage(taskId, text, files: File[])` — substitui a chamada separada de `addComment` + `addAttachment` no fluxo do diálogo. Cria os anexos, gera **uma única** entrada `TaskComment` com `attachmentIds` e **um único** evento de timeline `kind: "comment"`. Aceita `text` vazio se houver pelo menos 1 arquivo.
- `removeCommentAttachment(taskId, commentId, attachmentId)` — remove o anexo da lista de `task.attachments` e do `attachmentIds` do comentário. Marca `editedAt`/`editedBy`. Restrito ao autor + janela de 24h.
- `deleteComment(taskId, commentId)` — remove o comentário, seus anexos vinculados e o evento de timeline correspondente. Restrito ao autor + janela de 24h.
- `editComment` permanece (ajuste: também marca edição quando só o texto muda; já marca).

`addComment`/`addAttachment` antigos podem permanecer para uso futuro, mas o diálogo passa a usar exclusivamente `addMessage`.

## UI — `src/components/tasks/TaskDetailDialog.tsx`

### Composição (área de input)
Estrutura nova abaixo da timeline, dentro de uma "caixa de composição" única (rounded-xl, bg-muted, padding):

```
┌─────────────────────────────────────────┐
│  [chip arquivo1 ×] [chip arquivo2 ×]    │  ← só aparece se houver arquivos pendentes
├─────────────────────────────────────────┤
│  Textarea (MentionInput, sem fundo)     │
├─────────────────────────────────────────┤
│                       [📎]   [➤ Enviar] │
└─────────────────────────────────────────┘
```

- Estado local: `pending: File[]`.
- Drag & drop nos handlers `onDragOver/onDragLeave/onDrop` aplicados ao container externo da composição. Overlay com borda tracejada + texto "Solte para anexar" quando `dragOver === true`. Aceita múltiplos arquivos.
- Chips de pré-visualização: ícone por tipo (imagem → mini-thumb via `URL.createObjectURL`; outros → ícone `FileText`), nome truncado, tamanho formatado, botão `×` para remover do `pending`.
- Botão clipe (`Paperclip`) abre o file picker e adiciona ao `pending` (não envia).
- Botão enviar (`Send`):
  - desabilitado quando `text.trim() === "" && pending.length === 0`;
  - chama `addMessage(task.id, text.trim(), pending)`; limpa `text` e `pending`.
- Ajustar `MentionInput` para aceitar `className` opcional no `Textarea` (ou usar variante "embedded") para remover `bg-muted`/borda dentro da caixa de composição, evitando "caixa dentro de caixa".

### Renderização do comentário (`CommentBubble`)
- Mostrar `renderMentions(text)` (se não vazio) e, abaixo, a lista de anexos vinculados — chips clicáveis (`<a target=_blank>`) com `Paperclip` e nome.
- Eventos de timeline `kind: "attachment"` legados continuam renderizando como hoje (compatibilidade com anexos pré-existentes).

### Edição (`canEdit` mantém janela de 24h + autor)
Modo edição passa a ser "edição de mensagem", não só texto:
- `MentionInput` editável para o `text`.
- Lista de chips dos anexos da mensagem com botão `×` em cada um (chama `removeCommentAttachment`).
- Botões: `Salvar` / `Cancelar`.
- **Lixeira (excluir mensagem inteira)**: aparece (no lugar de "Salvar" ou ao lado de "Cancelar") quando o estado pós-edição seria "apenas 1 anexo e nenhum texto", conforme requisito. Implementação: ícone `Trash2` visível quando `draftText.trim() === "" && draftAttachmentIds.length <= 1`. Clique → `deleteComment` + `setEditing(false)`.

### Remoções de UI já existentes
- A dropzone separada (já removida no turno anterior) permanece ausente.
- O `addAttachment` standalone deixa de ser disparado pelo botão de clipe (que agora só popula `pending`).

## Notas de implementação
- Helper `formatBytes(n)` local (KB/MB).
- Usar `useEffect` cleanup para revogar `URL.createObjectURL` dos previews de imagens em `pending` ao desmontar/remover.
- Não tocar em `KanbanModule`, `TasksBoard`, `NewTaskDialog` nem `taskStore` além das partes listadas.

## Fora de escopo
- Persistência real de arquivos (continua `URL.createObjectURL` em memória).
- Reordenação de anexos.
- Edição de anexos em comentários antigos que não tenham `attachmentIds` (legados ficam read-only via o evento `kind: "attachment"`).
