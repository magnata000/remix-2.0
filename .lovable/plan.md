## Objetivo
Unificar filtros e botões de ação da aba Tarefas em uma única barra horizontal, removendo o Card de filtros separado.

## Alterações em `src/components/tasks/TasksBoard.tsx`

1. Remover o `<Card>` de filtros (bloco separado abaixo do header).
2. Remover a linha de descrição "Demandas internas..." (ou mantê-la acima, sem botões — confirmar abaixo).
3. Criar uma única barra de ações contendo, da esquerda para a direita:
   - **Buscar cliente** (Popover + Input com ícone search)
   - **Filtro de Colaborador** (Select "Todos os colaboradores")
   - **Mais recentes / Mais antigas** (Select de ordenação)
   - **Prioridade** (ToggleGroup Alta / Média / Baixa)
   - **Agendamentos** (Button outline)
   - **Gerenciar etapas** (Button outline)
   - **Nova tarefa** (Button primary brand)
4. Usar `flex flex-wrap items-center gap-2` para permitir quebra em telas menores. Ajustar larguras (`w-48`, `w-56`, `w-44`) para caber inline.
5. Manter todos os handlers e estados existentes inalterados (apenas reorganização visual).

Sem alterações de lógica/negócio. Apenas reorganização de layout.
