## Problema
Em `src/components/tasks/MentionInput.tsx`, a função `insertMention` atualiza o valor do textarea e chama `ref.current?.focus()`, mas não reposiciona o caret. Como o React re-renderiza o `Textarea` com o novo `value`, o cursor acaba na posição 0 (início do texto), em vez de logo após `@Nome ` inserido.

## Correção
Calcular a nova posição do caret no momento da inserção e aplicá-la via `setSelectionRange` após o `focus()`, dentro do `setTimeout(..., 0)` já existente (para rodar depois do re-render).

### Alteração em `insertMention` (MentionInput.tsx)

```ts
const insertMention = (name: string) => {
  if (mentionStart == null) return;
  const el = ref.current;
  const cursor = el?.selectionStart ?? value.length;
  const insert = `@${name} `;
  const next = value.slice(0, mentionStart) + insert + value.slice(cursor);
  const caret = mentionStart + insert.length; // posição final esperada
  onChange(next);
  setOpen(false);
  setMentionStart(null);
  setTimeout(() => {
    const node = ref.current;
    if (!node) return;
    node.focus();
    node.setSelectionRange(caret, caret);
  }, 0);
};
```

## Fora de escopo
- Comportamento de clique/seleção via mouse já passa pelo mesmo `insertMention` e fica corrigido junto.
- Nenhuma alteração em `taskStore`, `TaskDetailDialog` ou outros componentes.
