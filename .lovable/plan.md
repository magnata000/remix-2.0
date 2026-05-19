## Objetivo
Garantir que, no seletor "Data específica avulsa" das Tarefas Agendadas, a data final nunca seja anterior à data inicial.

## Alterações em `src/components/tasks/ScheduledTasksPanel.tsx`

1. **`DateRangePick` (onSelect)**: interceptar a seleção do react-day-picker. Se `range.to` existir e for anterior a `range.from`, descartar a seleção inválida e tratar o clique como nova data inicial (reiniciando `from` com a data clicada e `to = undefined`). Exibir `toast.error("A data final não pode ser anterior à inicial")`.

2. **Validação no submit (`handleSave`)**: além das checagens existentes, quando `kind === "data"`, validar `range.to && range.to < range.from`. Bloquear o save e mostrar o mesmo toast (defesa em profundidade).

3. **Sem mudanças de UI/estilo** — apenas lógica de validação. Nenhum outro componente ou store é afetado.
