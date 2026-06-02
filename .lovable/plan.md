## Objetivo
Na aba Tarefas (Kanban), o modal de detalhes da tarefa (`TaskDetailDialog`) deve manter a Timeline rolada até a última mensagem sempre que um novo evento for adicionado (comentário, anexo, mudança de etapa), e também ao abrir a tarefa.

## Mudanças

**`src/components/tasks/TaskDetailDialog.tsx`**

1. Criar `const timelineRef = useRef<HTMLDivElement>(null)` e anexá-lo ao `<div className="flex-1 overflow-y-auto …">` da Timeline (linha 88).
2. Adicionar `useEffect` que rola o container para o fim sempre que mudar:
   - `task?.id` (abrir outra tarefa)
   - `task?.timeline.length` (novo evento: comentário, anexo, movimentação)
   ```ts
   useEffect(() => {
     const el = timelineRef.current;
     if (el) el.scrollTop = el.scrollHeight;
   }, [task?.id, task?.timeline.length]);
   ```
3. Usar `requestAnimationFrame` dentro do efeito para garantir que o scroll ocorra após o render dos novos itens (incluindo bubbles com anexos que mudam de altura).

## Fora de escopo
- Não alterar comportamento "smart" (ex: não rolar se o usuário rolou para cima manualmente). Sempre acompanha a última mensagem, conforme pedido.
- Sem mudanças em estilos, store ou outros componentes.
