## Objetivo
Reagrupar todos os filtros/botões da aba Tarefas em uma única **box branca** (Card), com layout responsivo que não quebra feio nem sobrepõe elementos em telas menores.

## Alterações em `src/components/tasks/TasksBoard.tsx`

1. **Restaurar o Card branco** envolvendo toda a barra de filtros + botões (`<Card className="p-3 rounded-2xl">`).
2. **Manter a descrição** "Demandas internas..." acima do Card (fora da box), como linha de subtítulo.
3. **Estrutura interna do Card** em duas zonas com `flex flex-wrap items-center gap-2`:
   - **Zona esquerda (filtros, cresce)**: Buscar Cliente, Colaborador, Ordenação, Prioridade — agrupados em `flex-1 min-w-0 flex-wrap`.
   - **Zona direita (ações, fixa)**: Agendamentos, Gerenciar etapas, Nova tarefa — agrupados com `ml-auto flex-wrap`.
4. **Ajustes responsivos**:
   - Inputs/Selects com largura adaptativa: `w-full sm:w-56` (Buscar), `w-full sm:w-48` (Colaborador), `w-full sm:w-40` (Ordenação).
   - ToggleGroup de prioridade com `shrink-0`.
   - Botões de ação em telas estreitas (<sm): mostrar só ícone (`<span className="hidden md:inline">texto</span>`) para evitar sobreposição.
   - `gap-2` consistente, `flex-wrap` em todos os containers para quebra controlada.
5. **Sem alterações de lógica/negócio** — apenas reorganização visual e classes responsivas.

## Resultado
Em desktop (≥1024px): tudo em uma linha dentro da box branca.
Em tablet (640-1024px): filtros podem quebrar para uma segunda linha de forma alinhada.
Em mobile (<640px): inputs ocupam largura total empilhados, botões de ação compactados com ícones.
