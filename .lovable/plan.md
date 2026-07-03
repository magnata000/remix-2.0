
# Plano — Melhorias na página Kanban

## Visão geral
Cinco frentes: (1) CRUD do Pipeline alinhado ao padrão de Tarefas, (2) painel de analytics do Pipeline em rota dedicada, (3) recorrência avançada de tarefas, (4) áudio nos cards de Tarefas/Pipeline, (5) SLA em ambos os módulos. Todas reaproveitam componentes existentes e mantêm o padrão visual atual.

---

## 1. CRUD do Pipeline no padrão do TaskDetailDialog

**Objetivo:** unificar a experiência de detalhe do card entre Tarefas e Pipeline.

- Reescrever `src/components/pipeline/OpportunityDetailDialog.tsx` para replicar o layout do `TaskDetailDialog`:
  - Cabeçalho com título editável inline + badge de etapa.
  - Abas **Detalhes / Comentários / Atividade** (mesmos componentes visuais).
  - Aba Detalhes preserva campos específicos: valor, seguradora, ramo, produto, cliente, responsável, data de fechamento previsto, motivo de perda (quando aplicável).
  - Comentários e Atividade reutilizando `MentionInput` e o padrão de timeline já usado em Tarefas.
  - Anexos (clipe) + áudio (microfone) — ver item 4.
- Remover botão `⋮` do card no `KanbanModule` (coluna Pipeline). Card inteiro passa a abrir o drawer ao clicar (mesmo padrão do `TaskCard`). Ações de excluir e mover ficam dentro do drawer (botão "Excluir" destrutivo com `AlertDialog`) e via drag-and-drop (já existente).
- `NewOpportunityDialog` continua o mesmo; após criar, abre direto o novo drawer.
- Manter `CloseOpportunityDialog` (fluxo de ganho/perdido com motivo).
- Store `opportunityStore` recebe `addComment`, `addAttachment`, `addAudio`, `logActivity` (espelhando o `taskStore`).

## 2. Estatísticas do Pipeline com histórico de etapas

**Objetivo:** rota `/pipeline/analytics` acessível por botão "Estatísticas" no header do Pipeline.

- **Modelo de dados:** adicionar `stageHistory: { stage: string; enteredAt: string; exitedAt?: string }[]` em `Opportunity`. Toda mudança de etapa (drag-and-drop, close) fecha a entrada corrente e cria uma nova. Migrar mocks existentes com timestamps sintéticos derivados de `createdAt`/`updatedAt` para popular o gráfico já na primeira renderização.
- **Store:** `opportunityStore.moveToStage(id, stage)` passa a atualizar `stageHistory`. Idem para o fluxo de fechamento.
- **Cálculo (`src/lib/pipeline/salesStats.ts` reescrito):**
  - Contagem por etapa (aberto no momento).
  - Conversão etapa→etapa (leads que passaram por A e chegaram em B / leads que passaram por A).
  - Conversão total (Ganho / total criado).
  - Tempo médio em cada etapa (média das durações fechadas + em aberto).
  - Gargalo: etapa com maior tempo médio.
  - Maior perda: etapa cuja saída mais frequente é "Perdido".
  - Top motivos de perda (agrupamento de `lostReason`).
  - Leads → clientes convertidos (Ganhos únicos por cliente).
  - Ganhos vs perdidos (valor e contagem), ticket médio.
- **UI (`src/routes/pipeline.analytics.tsx` + `src/components/pipeline/PipelineAnalytics.tsx`):**
  - Row de KPIs no topo (conversão total, ticket médio, ganhos, perdidos, gargalo).
  - Gráfico de funil (barras horizontais decrescentes por etapa).
  - Barra empilhada de conversão etapa→etapa.
  - Tabela: etapa · leads atuais · tempo médio · % saída para próxima · % perda.
  - Lista Top 5 motivos de perda.
  - Filtros: período (últimos 30/90/365 dias / customizado) e responsável.
  - Botão "Voltar ao Pipeline" no header. Botão "Estatísticas" adicionado ao header do `KanbanModule` aba Pipeline.

## 3. Recorrência avançada de tarefas

**Objetivo:** trocar o campo "Repetir" simples por um editor tipo Google Calendar.

- **Novo tipo em `taskStore`:**
  ```ts
  type Recurrence = {
    freq: 'daily' | 'weekly' | 'monthly';
    interval: number;              // a cada X
    byWeekday?: number[];          // 0..6, semanal
    byMonthDay?: number;           // 1..31, mensal
    parity?: 'even' | 'odd';       // diário: pares/ímpares
    until?: string;                // opcional: data-fim
    count?: number;                // opcional: N ocorrências
  };
  ```
- **UI:** novo `RecurrenceEditor` dentro do `ScheduledTasksPanel`, com abas Diário/Semanal/Mensal e input "a cada X", chips de dias da semana e seletor de dia do mês. Preview em texto ("A cada 2 semanas, seg/qua/sex, até 31/12").
- **Engine:** `src/lib/tasks/recurrence.ts` com `expandOccurrences(rule, from, to)` para expandir próximas ocorrências. `workflowEngine.ts` passa a consultar essa função ao materializar tarefas agendadas.
- Migração dos agendamentos atuais: converter `repeat: 'daily'|'weekly'|'monthly'` em `{ freq, interval: 1 }`. Sem quebra de UX.

## 4. Áudio nos cards (Pipeline + Tarefas)

**Objetivo:** gravar e reproduzir áudio no drawer de detalhes de ambos os módulos.

- **Componente `src/components/shared/AudioRecorder.tsx`:**
  - Ícone de microfone ao lado do clipe (anexo).
  - Ao clicar: usa `navigator.mediaDevices.getUserMedia({ audio: true })` + `MediaRecorder`.
  - Estados: idle → gravando (timer + waveform simples) → prévia (play/re-gravar/cancelar/enviar).
  - Envia como `{ id, name: "audio-<timestamp>.webm", type: 'audio', dataUrl, durationSec }` para o mesmo array de anexos do card.
  - Limite: 2 min por gravação (evita estourar localStorage).
- **Player:** para itens `type: 'audio'`, renderizar `<audio controls>` inline dentro do timeline de comentários/anexos.
- **Persistência:** dataURL no `taskStore`/`opportunityStore` (mesmo mecanismo dos anexos atuais).
- **Tratamento de erro:** permissão negada → toast "Habilite o microfone nas permissões do navegador".

## 5. SLA em Pipeline e Tarefas

**Objetivo:** prazo por card com semáforo automático e configuração por coluna/etapa.

- **Modelo:**
  - `Task.slaDueAt?: string`, `Task.slaPausedAt?: string`.
  - `Opportunity.slaDueAt?: string`, `Opportunity.slaPausedAt?: string`.
  - `taskColumn.slaHours?: number` e `pipelineStage.slaHours?: number` (defaults por coluna/etapa).
- **Configuração:** nova subseção em Configurações → **SLA**:
  - Tabela editável com colunas Tarefas + etapas Pipeline e input "Prazo (h)".
  - Botões "Aplicar SLA a cards existentes sem prazo" (opcional).
  - Ao mover card entre colunas/etapas, se destino tem `slaHours`, recalcula `slaDueAt = now + slaHours` (a menos que o card tenha SLA explícito, ver pergunta futura — por ora sobrescreve com confirmação).
- **Pausa automática:** ao entrar em `Ganho`/`Perdido` (Pipeline) ou `Concluída` (Tarefas), grava `slaPausedAt` e para o cronômetro. Ao voltar para uma coluna ativa, retoma somando a pausa.
- **Semáforo (no `TaskCard` e no `OpportunityCard`):**
  - Verde: `remaining > 50% do prazo total`.
  - Amarelo: `remaining ≤ 50%` e `> 0`.
  - Vermelho: vencido (`remaining < 0`).
  - Badge inline com ícone de relógio + contagem regressiva (`2d 3h`, `4h 12min`, `Vencido há 1d`).
  - Faixa lateral colorida no card (borda esquerda 3px).
- **Atualização:** hook `useSlaTicker` re-render a cada 60s nos boards.
- **Editar no drawer:** campo "Prazo (SLA)" com date-time picker + botão "Usar padrão da coluna/etapa".

---

## Arquivos impactados (resumo)

**Novos:**
- `src/routes/pipeline.analytics.tsx`
- `src/components/pipeline/PipelineAnalytics.tsx`
- `src/components/shared/AudioRecorder.tsx`
- `src/components/tasks/RecurrenceEditor.tsx`
- `src/lib/tasks/recurrence.ts`
- `src/hooks/useSlaTicker.ts`
- `src/lib/sla/slaConfig.tsx` (store de defaults por coluna/etapa)
- `src/components/settings/SlaConfigSection.tsx`

**Modificados:**
- `src/components/modules/KanbanModule.tsx` — remove `⋮` do card do Pipeline, adiciona botão "Estatísticas".
- `src/components/pipeline/OpportunityDetailDialog.tsx` — reescrita no padrão TaskDetailDialog.
- `src/components/pipeline/*Card` (dentro do KanbanModule) — SLA badge + click abre drawer.
- `src/components/tasks/TaskCard.tsx` — SLA badge.
- `src/components/tasks/TaskDetailDialog.tsx` — campo SLA + integração AudioRecorder.
- `src/components/tasks/ScheduledTasksPanel.tsx` — usa RecurrenceEditor.
- `src/lib/pipeline/opportunityStore.ts` — stageHistory, addComment/addAttachment/addAudio, SLA, moveToStage.
- `src/lib/pipeline/salesStats.ts` — reescrito com métricas completas.
- `src/lib/tasks/taskStore.tsx` — SLA fields, addAudio.
- `src/lib/tasks/workflowEngine.ts` — usa recurrence.expandOccurrences.
- `src/lib/mock/data.ts` — migração dos mocks (stageHistory sintético).
- `src/components/modules/SettingsModule.tsx` — inclui SlaConfigSection.

## Fora do escopo
- Backend real / persistência remota (mantém store local como hoje).
- Notificações push de SLA (só semáforo visual).
- Métricas por vendedor cruzadas com repasses (fica em Financeiro).
