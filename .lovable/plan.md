## Objetivo
Fazer o ícone de **lápis** no card abrir um formulário de edição com os mesmos campos do formulário de criação (título, descrição, prazo, prioridade, colaborador, coluna, cliente), em vez de abrir o painel de detalhes/timeline.

## Abordagem
Reaproveitar `NewTaskDialog` transformando-o em formulário dual-modo (criar/editar) para evitar duplicação de UI.

## Alterações

### `src/lib/tasks/taskStore.tsx`
- Adicionar ação:
  ```ts
  updateTaskFields: (id: string, patch: Partial<Pick<TaskItem,
    "title" | "description" | "dueDate" | "priority" | "assigneeId" | "clientName" | "columnId"
  >>) => void;
  ```
- Implementação via `setTasks(arr => arr.map(...))`. Quando `columnId` mudar, registrar uma entrada no `timeline` (kind `"moved"`, igual ao `moveTask`) para manter coerência. Demais campos não geram timeline (mantém o histórico limpo).
- Expor no `Ctx` e no `value`.

### `src/components/tasks/NewTaskDialog.tsx`
- Renomear o componente para algo dual-modo, porém **manter o arquivo e o nome do export** (`NewTaskDialog`) para evitar quebrar imports; adicionar nova prop opcional:
  ```ts
  type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    defaultColumnId?: string;
    task?: TaskItem; // quando presente => modo edição
  };
  ```
- `useEffect` que, quando `open` vira `true`, popula os estados a partir de `task` (modo edição) ou reseta (modo criação).
- Título do diálogo dinâmico: "Nova tarefa" vs "Editar tarefa".
- Botão primário: "Criar tarefa" vs "Salvar alterações".
- `submit()`:
  - Se `task` definido: chama `updateTaskFields(task.id, {...})` e `toast.success("Tarefa atualizada")`.
  - Caso contrário: comportamento atual.

### `src/components/tasks/TasksBoard.tsx`
- Novo estado: `editTask: TaskItem | null`.
- Trocar `onEdit={() => setDetail(t)}` por `onEdit={() => setEditTask(t)}`.
- Renderizar uma segunda instância de `NewTaskDialog` em modo edição:
  ```tsx
  <NewTaskDialog
    open={!!editTask}
    onOpenChange={(v) => { if (!v) setEditTask(null); }}
    task={editTask ?? undefined}
  />
  ```
- O clique no corpo do card continua abrindo o `TaskDetailDialog` (visualização/timeline). Apenas o lápis aciona o formulário de edição.

## Fora de escopo
- Não altera `TaskDetailDialog` nem comentários/anexos.
- Não cria entrada de timeline para edições de campos textuais (somente para mudança de coluna, mantendo o comportamento de `moveTask`).
