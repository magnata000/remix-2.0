## Objetivo
Inverter o comportamento das teclas na caixa de comentários da timeline:
- `Enter` → envia o comentário
- `Ctrl/Cmd + Enter` → quebra de linha
- `Shift + Enter` → continua quebrando linha (padrão usual, mantido)

Quando o popover de @menções estiver aberto, `Enter` continua selecionando o colaborador (comportamento atual preservado).

## Alteração em `src/components/tasks/MentionInput.tsx`

No handler `onKeyDown`, após o bloco que trata o popover de menções aberto:

1. Se `e.key === "Enter"` e `e.ctrlKey || e.metaKey` → **NÃO** prevenir default; deixar inserir quebra de linha manualmente via `document.execCommand` ou, mais simples, inserir `"\n"` na posição do cursor e atualizar `value`.
2. Se `e.key === "Enter"` sem modificadores e sem Shift → `e.preventDefault()` e chamar `onSubmit?.()`.
3. `Shift + Enter` → comportamento padrão do textarea (quebra de linha), nenhum tratamento.

## Verificação
- Confirmar que `TaskDetailDialog` usa `onSubmit` do `MentionInput` para postar o comentário (já é o caso).
- Nenhuma outra mudança de UI/estilo.
