## Objetivo
Preservar quebras de linha (`\n`) na renderização dos comentários da timeline.

## Causa
O texto é renderizado em `<span>` inline padrão (`white-space: normal`), que colapsa `\n` em espaço.

## Alteração em `src/components/tasks/TaskDetailDialog.tsx`

Linha 186 — adicionar `whitespace-pre-wrap break-words` ao span que envolve `renderMentions(comment.text)`:

```tsx
<span className="flex-1 whitespace-pre-wrap break-words">
  {renderMentions(comment.text)}
</span>
```

Sem outras mudanças.
