## Problema
Ao reabrir o card de tarefa, a Timeline mostra a primeira mensagem em vez da última. Causa: o `DialogContent` do Radix tem animação de abertura; o `requestAnimationFrame` único dispara antes do layout final, então `scrollHeight` ainda não reflete o conteúdo completo.

## Mudança

**`src/components/tasks/TaskDetailDialog.tsx`**

Trocar o `useEffect` atual por uma versão que rola após a animação assentar:

```ts
useLayoutEffect(() => {
  if (!task) return;
  const el = timelineRef.current;
  if (!el) return;
  // Dois RAFs garantem que o scroll ocorra após o layout final do DialogContent
  const r1 = requestAnimationFrame(() => {
    const r2 = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    (el as any).__r2 = r2;
  });
  return () => {
    cancelAnimationFrame(r1);
    if ((el as any).__r2) cancelAnimationFrame((el as any).__r2);
  };
}, [task?.id, task?.timeline.length]);
```

Adicionar `useLayoutEffect` ao import do React.

## Fora de escopo
- Outros componentes/estilos.
