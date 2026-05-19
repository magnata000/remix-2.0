## Objetivo
Exibir a data como `dd/mm/aaaa` (numérica) nos cards de Tarefas e nos cards do Pipeline de Vendas, em vez do formato por extenso atual (ex: "21 de mai. de 2026").

## Escopo
Alteração apenas visual, restrita aos dois cards mencionados. Demais telas (Apólices, Financeiro, Dashboard, Multicálculo, diálogos de detalhe/edição) continuam usando o formato por extenso já existente.

## Mudanças

1. `src/lib/mock/data.ts`
   - Adicionar um novo helper `formatDateShort(iso)` que retorna `dd/mm/aaaa` via `toLocaleDateString("pt-BR")`.
   - Manter `formatDate` intacto para não afetar as outras telas.

2. `src/components/tasks/TaskCard.tsx`
   - Trocar `formatDate(task.dueDate)` por `formatDateShort(task.dueDate)`.

3. `src/components/modules/KanbanModule.tsx`
   - No card do pipeline de vendas, trocar `formatDate(task.dueDate)` por `formatDateShort(task.dueDate)`.

## Fora de escopo
- Não alterar formato de data no diálogo de detalhes da tarefa, no formulário de nova tarefa, no painel de tarefas agendadas, nem em Multicálculo/Apólices/Financeiro/Dashboard.