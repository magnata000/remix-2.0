## Causa
Em `src/components/tasks/TaskDetailDialog.tsx` o painel da caixa de composição vive dentro de `<section className="... overflow-hidden">` (linha 86) e da área scrollável da timeline. A lista de menções do `MentionInput` é posicionada com `absolute bottom-full`, então quando ela cresce para cima ela é cortada pelos ancestrais com `overflow-hidden`.

## Correção
Renderizar a lista flutuante via **portal** em `document.body`, com posicionamento `fixed` calculado a partir do `getBoundingClientRect()` do `<textarea>`. Assim ela escapa de qualquer `overflow:hidden` ancestral e nunca fica clipada.

### Alterações em `src/components/tasks/MentionInput.tsx`
- Importar `createPortal` de `react-dom` e `useLayoutEffect`.
- Estado novo: `pos: { left: number; bottom: number; width: number } | null`.
- `useLayoutEffect` que, quando `open === true`, lê `ref.current.getBoundingClientRect()` e calcula:
  ```ts
  setPos({
    left: rect.left,
    bottom: window.innerHeight - rect.top + 8, // 8px = mb-2
    width: Math.max(rect.width, 256),
  });
  ```
  Reexecuta quando `open`, `options.length` ou `value` mudam.
- Adicionar listener `window` para `scroll` (capture) e `resize` enquanto `open`, reaplicando o cálculo, para acompanhar rolagem da timeline e redimensionamento.
- Trocar o `<div className="absolute ...">` por:
  ```tsx
  {open && pos && createPortal(
    <div
      style={{ position: "fixed", left: pos.left, bottom: pos.bottom, width: pos.width, maxWidth: "min(20rem, 90vw)" }}
      className="z-[100] rounded-xl border border-border bg-popover/95 backdrop-blur-sm shadow-xl ring-1 ring-border/50 p-1 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* mesmo conteúdo de options.map / empty state */}
    </div>,
    document.body
  )}
  ```
- Remover `className="relative"` do wrapper externo (não é mais necessário) ou mantê-lo inofensivo; preservar o resto do componente.

### Detalhes
- `z-[100]` garante que o popover fique acima do `DialogContent`.
- `maxHeight` adicional opcional `max-h-[60vh] overflow-y-auto` para casos extremos com muitos itens.
- Cleanup remove os listeners no `useEffect` de unmount / quando `open` vira `false`.

## Fora de escopo
- Não alterar `TaskDetailDialog`, `taskStore` ou qualquer outro arquivo.
- Não mudar o comportamento do `@`, das opções "Todos" / deduplicação, nem do caret — apenas o posicionamento visual da lista.
