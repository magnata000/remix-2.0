# Tarefas agendadas nunca viram cartões — materialização + correções

## Diagnóstico (confirmado no código e no banco)

Os agendamentos são gravados na tabela `scheduled_tasks` e aparecem na lista do painel, mas **não existe nenhuma rotina que os converta em tarefas reais** quando a data ou recorrência chega. O motor de recorrência (`recurrence.ts`) está pronto, porém nunca é chamado. Prova: 7 agendamentos no banco (um deles vencido há 4 dias) e zero tarefas com `source_key`.

Bugs relacionados que serão corrigidos no mesmo pacote:
1. Responsável "Todos os colaboradores" (`"all"`) quebra o insert (coluna `uuid`) — o erro é engolido e o painel exibe "Agendamento criado" mesmo falhando. O mesmo valor `"all"` é usado pelo motor de workflows (vigência, reajuste Saúde, faixa etária), que por isso também nunca gerou cartões.
2. Toasts de sucesso disparam antes da resposta do servidor, escondendo falhas.

## Solução

### 1. Motor de materialização de agendamentos

Novo módulo `src/lib/tasks/schedulerEngine.ts` com função pura `computeDueScheduledTasks({ scheduled, now })` que devolve os cartões a criar, cada um com `sourceKey = "sched:<idDoAgendamento>:<yyyy-mm-dd>"`. O envio usa o `bulkAddTasks` já existente, que faz upsert com `ignoreDuplicates` na `source_key` (índice único `tasks_source_key_uniq` já existe no banco) — ou seja, rodar a rotina várias vezes nunca duplica cartões.

Regras por tipo:
- **Data específica sem repetir**: um cartão no dia escolhido. Se ninguém abriu o app no dia, recupera até 14 dias para trás (aparece como atrasada).
- **Data com repetição** (mensal, bimestral, trimestral, semestral, anual): um cartão a cada período, contando da data inicial; `end_date` (quando maior que a inicial) atua como limite.
- **Dias da semana**: um cartão em cada dia da semana selecionado.
- **Recorrência avançada**: usa o `expandOccurrences` já existente.
- Para os tipos repetidos, além da ocorrência do dia, recupera **apenas a última ocorrência perdida** — evita uma enxurrada de cartões atrasados quando o app fica dias sem abrir.
- Cartões entram na primeira coluna do quadro, com `dueDate` = data da ocorrência, título/descrição/prioridade do agendamento.

### 2. Gatilho no TaskStoreProvider

Hoje o motor de workflows só roda ao abrir a aba Tarefas. A materialização dos agendamentos ficará no `TaskStoreProvider` (efeito após o carregamento do quadro, com guarda contra repetição), assim ela acontece em qualquer página — inclusive ao abrir a Daily, que é a página inicial.

### 3. Correção do responsável "Todos"

- Em `tasks.functions.ts` (`createTask`, `bulkCreateTasks`, `createScheduled`, `updateScheduled`): normalizar `"all"`/vazio para o usuário logado (o banco exige um único responsável por cartão).
- Isso destrava também o motor de workflows, que hoje falha em silêncio pelo mesmo motivo.

### 4. Feedback real nas ações do painel

Converter `addScheduled`/`updateScheduled`/`removeScheduled` para o padrão `mutateAsync` (como já existe em Follow-ups) e exibir `toast.error` quando o servidor recusar — fim das falhas silenciosas.

### 5. Testes

Testes unitários (Vitest, padrão já usado no projeto) para `schedulerEngine`: cada tipo de agendamento, janela de recuperação, limites de repetição e dedupe por `sourceKey`.

## Detalhes técnicos

- Arquivos: `src/lib/tasks/schedulerEngine.ts` (novo), `schedulerEngine.test.ts` (novo), `src/lib/tasks/taskStore.tsx`, `src/lib/tasks/tasks.functions.ts`, `src/components/tasks/ScheduledTasksPanel.tsx`.
- Sem migração de banco: tabelas, colunas e o índice de dedupe já existem.
- Após a correção, os agendamentos já gravados passam a gerar cartões automaticamente — ex.: "Assembléia Porto Seguro" (21/08) aparecerá como atrasada e "Verificar Pagamentos Vencidos" (seg–sex) passa a aparecer todo dia útil.
