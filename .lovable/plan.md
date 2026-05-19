## Objetivo
Adicionar ícones discretos de **lápis (editar)** e **lixeira (excluir)** nos cards da aba Tarefas, visíveis apenas no hover.

## Comportamento
- **Lápis**: abre o `TaskDetailDialog` já existente (mesmo efeito do clique no card). Serve como entrada explícita para visualizar/editar.
- **Lixeira**: abre um `AlertDialog` de confirmação ("Excluir tarefa? Esta ação não pode ser desfeita.") e, ao confirmar, remove a tarefa e exibe `toast.success("Tarefa excluída")`.
- Os ícones só aparecem no hover do card (`opacity-0 group-hover:opacity-100 transition-opacity`), no canto superior direito, ao lado do badge de prioridade.
- `stopPropagation` em ambos os botões para não disparar o `onClick` do card.

## Alterações

### `src/lib/tasks/taskStore.tsx`
- Adicionar ação no contexto:
  ```ts
  const deleteTask = useCallback((id: string) => {
    setTasks((arr) => arr.filter((t) => t.id !== id));
  }, []);
  ```
- Incluir `deleteTask` no tipo `Ctx` e no `value` exportado.

### `src/components/tasks/TaskCard.tsx`
- Trocar o `<button>` raiz por um `<div className="group relative ...">` com `role="button"`, `tabIndex={0}`, `onClick`, e `onKeyDown` (Enter/Space) para preservar acessibilidade.
- Novas props:
  ```ts
  type Props = {
    task: TaskItem;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
  };
  ```
- Barra de ações flutuante no canto superior direito (antes do badge), exibindo `Pencil` e `Trash2` (lucide-react) tamanho `h-3.5 w-3.5`:
  - container: `absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity`
  - botões: `p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground` (lixeira ganha `hover:text-destructive`)
- Reajustar padding do topo (`pt-7` ou similar) para não sobrepor o título quando aparecerem, OU manter os botões no canto sem mover o conteúdo (preferência: sem mover; o título já tem espaço suficiente à direita do badge).

### `src/components/tasks/TasksBoard.tsx`
- Estado novo: `confirmDelete: TaskItem | null`.
- Passar handlers ao `TaskCard`:
  ```tsx
  <TaskCard
    task={t}
    onClick={() => setDetail(t)}
    onEdit={() => setDetail(t)}
    onDelete={() => setConfirmDelete(t)}
  />
  ```
- Pegar `deleteTask` via `useTaskStore()` e importar `toast` de `sonner`.
- Renderizar uma única instância de `AlertDialog` (de `@/components/ui/alert-dialog`) controlada por `confirmDelete`, com botão de confirmação destrutivo que chama `deleteTask` e fecha o modal.

## Fora de escopo
- Edição inline dos campos da tarefa (título, prazo, responsável, etc.) continua via `TaskDetailDialog`. Um modo de edição completa em formulário pode ser endereçado em outro turno.
- Não toca em `KanbanModule`, pipeline, tarefas agendadas nem no `MentionInput`.
