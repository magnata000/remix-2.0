# Adicionar opção "Todos" no campo Colaborador

Permitir criar tarefas gerais, sem dono específico, que aparecem no quadro de qualquer colaborador (mesmo quando o filtro de colaborador está aplicado a um membro específico).

## Comportamento

- No dialog "Nova tarefa" (e edição), o campo **Colaborador** ganha a opção **Todos** no topo da lista, acima dos membros do time.
- Tarefas com colaborador "Todos" aparecem:
  - sempre, quando o filtro do board está em "Todos os colaboradores" (já acontece);
  - **também** quando o filtro é trocado para um colaborador específico (Ana, Carlos, etc.) — pois é tarefa geral.
- Visualmente, no `TaskCard` e no `TaskDetailDialog`, o avatar/iniciais do colaborador é substituído por um ícone de grupo (`Users`) e o nome exibido é "Todos".

## Arquivos a alterar

**`src/lib/tasks/taskStore.tsx`** — exportar constante `ALL_ASSIGNEE_ID = "all"` e helper `isAllAssignee(id)`. Nenhuma mudança no shape do `TaskItem` (continua `assigneeId: string`).

**`src/components/tasks/NewTaskDialog.tsx`** — adicionar `<SelectItem value="all">Todos</SelectItem>` no topo do select de Colaborador, antes do `team.map(...)`.

**`src/components/tasks/TasksBoard.tsx`** — ajustar o filtro:
```ts
if (fAssignee !== "todos")
  list = list.filter((t) => t.assigneeId === fAssignee || t.assigneeId === "all");
```

**`src/components/tasks/TaskCard.tsx`** — quando `task.assigneeId === "all"`, renderizar avatar com ícone `Users` (lucide) e tooltip/label "Todos" em vez das iniciais do membro.

**`src/components/tasks/TaskDetailDialog.tsx`** — quando `task.assigneeId === "all"`, exibir "Todos" com o mesmo ícone de grupo no badge do responsável (linhas 88–89 do helper `nameOf`/`initialsOf`).

## Fora de escopo

- `ScheduledTasksPanel` (tarefas agendadas) — o usuário pediu apenas no "Nova tarefa". Mantém-se como está.
- Filtro do board ("Todos os colaboradores") continua com o mesmo rótulo; não muda.
- Notificações / menções / lógica de permissão por colaborador.
