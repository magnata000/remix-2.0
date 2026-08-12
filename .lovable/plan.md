# Spec da página Kanban (Quadro)

Entregar um documento markdown em `/mnt/documents/kanban-spec.md`, no mesmo modelo do `carteira-spec.md`: tudo que a página armazena, todas as features, relacionamentos com outras páginas e o necessário para recriá-la em outro projeto (sem detalhes de design).

## Estrutura do documento

1. **Visão geral** — módulo "Quadro" com duas abas: Pipeline de Vendas e Tarefas; alternância entre visão Board e Estatísticas.
2. **Modelos de dados**
   - `Opportunity` (Task + createdAt, closedAt, comments, attachments, timeline, stageHistory, campos de SLA, quoteGroupId, lostReason/lostNote).
   - `TaskItem`, `TaskColumn`, `TaskComment`, `TaskAttachment`, `TaskTimelineEvent`, `Priority`.
   - `ScheduledTask` (kinds data/semana/recorrente), `Recurrence`, `PeriodKind`.
   - Config de SLA e `SlaStatus` (green/yellow/red), estágios/colunas terminais.
3. **Aba Pipeline de Vendas**
   - 5 estágios fixos (lead, cotação, negociação, fechado, perdido), contadores, drag-and-drop no desktop e tabs por estágio no mobile.
   - Conteúdo do card: título, cliente, ramo, valor, badge de SLA, prazo, responsável, motivo de perda.
   - Fluxos: nova oportunidade, edição, exclusão com confirmação, mover para Fechado (dialog de valor fechado), mover para Perdido (dialog de motivo + nota), detalhe com mensagens/áudio/anexos/timeline/comentários fixados.
   - Regras de `stageHistory`, `closedAt` e pausa de SLA em estágio terminal; foco/destaque de card via navegação externa.
   - Multicálculo atrás de feature flag (`FEATURES.multicalc`), com vínculo por `quoteGroupId`.
4. **Estatísticas do Pipeline** — métricas de `computePipelineAnalytics` (conversão por estágio, tempo médio por estágio, motivos de perda, vendas/receita por mês) e formatação de horas.
5. **Aba Tarefas** — board com colunas configuráveis, cores, gestão de colunas, cards com prioridade/prazo/SLA/prévia da última mensagem, atribuição a um membro ou "Todos", detalhe da tarefa, menções, anexos, áudio, painel de tarefas agendadas (data, semana, recorrência) e motor de workflows.
6. **Relacionamentos** — Daily (tarefas em 3 dias, atrasadas e menções), Carteira/Clientes (nome do cliente), Financeiro (valor fechado como base de venda), Configurações (SLA, equipe), Multicálculo (desativado por flag).
7. **Regras de negócio numeradas** — SLA (limiares e pausa), prioridade, unicidade de vínculo de cotação, ordem de estágios, limite de comentários fixados, limite de prévia de mensagem, permissões de edição/exclusão de comentário (apenas autor).
8. **Checklist de recriação** — stores/providers necessários, ordem de providers, utilitários compartilhados, armadilhas conhecidas (hidratação com datas, `URL.createObjectURL` para anexos, IDs sintéticos, seed de histórico de estágio).

## Detalhes técnicos

Fontes que serão lidas integralmente antes de escrever: `KanbanModule.tsx`, `opportunityStore.ts`, `salesStats.ts`, `PipelineAnalytics.tsx`, os 4 dialogs de pipeline, `LostReasonDialog`, `SlaBadge`/`SlaControl`/`slaConfig`, `TasksBoard`, `TaskCard`, `TaskDetailDialog`, `NewTaskDialog`, `ManageColumnsDialog`, `ScheduledTasksPanel`, `RecurrenceEditor`, `MentionInput`, `taskStore.tsx`, `recurrence.ts`, `workflowEngine.ts`, `searchTasks.ts`, `Timeline.tsx`, `AudioRecorder.tsx`.

Nenhum arquivo do app será alterado — a entrega é apenas o markdown.
