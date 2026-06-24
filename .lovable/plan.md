## Feedback geral

A maioria das mudanças se encaixa em padrões já existentes (CommentBubble, Timeline, ScheduledTasksPanel), então o esforço é baixo e bem contido. O ponto mais sensível é o engine de workflows: como não temos backend, ele roda no client ao montar a aba Tarefas, com dedupe por `policyId + tipo + data-alvo` para não duplicar cards entre sessões.

Ressalva importante: como o estado das tarefas é apenas em memória (sem persistência), os cards gerados desaparecem ao recarregar a página e serão recriados. Se isso te incomodar, dá pra adicionar `localStorage` em uma etapa futura — fora do escopo deste plano.

---

## 1. Pin de mensagens no Pipeline de Vendas

**Arquivos:** `src/lib/pipeline/opportunityStore.ts`, `src/components/pipeline/OpportunityDetailDialog.tsx`

- Adicionar `togglePinComment(opportunityId, commentId)` no store, idêntico ao de tarefas (respeita `MAX_PINNED_COMMENTS = 3`).
- No `OpportunityDetailDialog`, replicar o bloco "Fixadas" do `TaskDetailDialog` acima da timeline (mesmo visual, mesmo `Pin` icon, mesmo limite).
- Passar `pinned`, `canPin`, `onTogglePin` ao `CommentBubble`.

## 2. Exclusão de mensagem em até 24h (Pipeline + Tarefas)

**Arquivos:** `src/components/shared/Timeline.tsx`

Hoje o `CommentBubble` só mostra o botão "Excluir" no modo de edição e quando `draft.trim()` está vazio (truque oculto). Vamos tornar explícito:

- Adicionar prop `canDelete: boolean` ao `CommentBubble`.
- Mostrar um botão de lixeira (`Trash2`) ao lado do lápis (mesmo padrão `opacity-0 group-hover/comment:opacity-100`) quando `canDelete` for true.
- Confirmação inline simples (`window.confirm` ou um `AlertDialog`).
- Nos dois dialogs (Tarefas e Pipeline), passar `canDelete = c.authorId === currentUserId && Date.now() - new Date(c.createdAt).getTime() < EDIT_WINDOW_MS` (24h, já definido).
- O atalho de "esvaziar o texto p/ excluir" em modo edição continua existindo para não quebrar o fluxo atual.

## 3. Busca unificada (Clientes + Mensagens + Documentos) na aba Tarefas

**Arquivos:** `src/components/tasks/TasksBoard.tsx`, `src/lib/tasks/searchTasks.ts`

- Remover o `Popover` do ícone de lupa (à direita) e o input "Buscar cliente..." (à esquerda).
- Substituir por **um único** campo de busca à esquerda com `Popover` que mostra, conforme o termo:
  - Lista de **clientes** que casam (filtra o board por `clientName`, como o input atual).
  - Lista de **tarefas** com matches em comentários/anexos (via `searchTasks`), com snippet — abre o `TaskDetailDialog` com `initialSearch` preenchido (lógica atual do globalResults).
- Estado consolidado em um `query` único; resultados agrupados por seção ("Clientes", "Mensagens e documentos") usando `Command` / `CommandGroup`.
- Selecionar cliente → seta `fClient` (mantém filtro do board). Selecionar tarefa → abre detalhe.

## 4. Campo "Descrição" no formulário de Agendamentos

**Arquivos:** `src/lib/tasks/taskStore.tsx`, `src/components/tasks/ScheduledTasksPanel.tsx`

- Adicionar `description?: string` em `ScheduledTask`.
- No `ScheduledTasksPanel`, novo `<Textarea>` "Descrição" abaixo do título (mesmo estilo do `NewTaskDialog`).
- Incluir `description` no `payload` de `addScheduled`/`updateScheduled` e em `startEdit`/`resetForm`.

## 5. Alinhamento dos ícones na lista de tarefas programadas

**Arquivos:** `src/components/tasks/ScheduledTasksPanel.tsx` (linhas ~184-199)

Hoje o `<li>` usa um único flex row com `gap-2` entre título, badge, editar e excluir — quando o título é curto (caso do mock "Felicitar aniversariantes"), os botões ficam próximos do título; quando o título é longo (ou existe descrição), o `min-w-0 flex-1` empurra os botões para a direita, deixando-os "afastados".

- Reorganizar o `<li>` em duas colunas: `[conteúdo flex-1 min-w-0] [ações shrink-0 flex items-center gap-1]`.
- Badge entra no bloco de conteúdo (abaixo da descrição, como meta) ou ao lado do título com `shrink-0`.
- Botões de editar/excluir sempre encostados no canto direito do card, mesmo espaçamento independente do título.

## 6. Workflows automáticos (cards na aba Tarefas)

**Novo arquivo:** `src/lib/tasks/workflowEngine.ts`
**Arquivos editados:** `src/lib/tasks/taskStore.tsx`, `src/components/tasks/TasksBoard.tsx`

### Engine
Função `runWorkflows({ policies, existingTasks, now })` que retorna `Omit<TaskItem,...>[]` para criar. Regras:

| Workflow | Condição | Data-alvo | Origem |
|---|---|---|---|
| Vigência | `branch ≠ "Saúde"` e `endDate` está entre `now` e `now+10d` | `endDate` | `policy` |
| Reajuste Saúde | `branch === "Saúde"` e `healthAnniversary` (mês/dia) cai entre `now` e `now+30d` | próxima ocorrência do aniversário | `policy` |
| Faixa etária | para cada beneficiário, próximo aniversário que completa idade ANS (19,24,29,34,39,44,49,54,59) em até 30d | data do aniversário | `policy + beneficiary` |

Dedupe: cada card recebe `sourceKey = "wf:<tipo>:<policyId>[:<beneficiaryId>]:<yyyy-mm-dd da data-alvo>"`. Engine ignora se já existir tarefa com mesmo `sourceKey`.

### Estrutura do card gerado
- `columnId`: primeira coluna ("Demanda" — `c-demanda` no seed).
- `priority`: `"alta"`.
- `assigneeId`: `"all"`.
- `clientName`: do `policy`.
- `dueDate`: data-alvo (ISO).
- `title` / `description` por tipo:
  - **Vigência:** "Renovação {branch} — {cliente} (vence {dd/mm})" / "Apólice {número} vence em {dd/mm/yyyy}. Confirmar coberturas e enviar proposta de renovação."
  - **Reajuste Saúde:** "Reajuste Saúde — {cliente} ({dd/mm})" / "Aniversário da apólice {número} em {dd/mm/yyyy}. Revisar reajuste anual e comunicar o cliente."
  - **Faixa etária:** "Faixa etária — {beneficiárioNome} faz {idade} em {dd/mm}" / "Beneficiário da apólice {número} ({titularNome}) completa {idade} anos em {dd/mm/yyyy} — possível mudança de faixa etária."

### Integração
- `TaskItem` ganha campo opcional `sourceKey?: string` (só para dedupe; não exibido).
- `useTaskStore` expõe `bulkAddTasks(records)` que aceita já com `sourceKey` e ignora os que já existem.
- Em `TasksBoard.tsx`, `useEffect` único no mount: importa `policies` de `usePolicyStore`, roda `runWorkflows`, chama `bulkAddTasks`. Roda só uma vez por montagem da aba.

---

## Fora de escopo

- Persistência (`localStorage`) das tarefas geradas.
- Notificações/badge na sidebar quando workflow cria card.
- Workflow para "Auto/Vida/Residencial/Empresarial/Consórcio" diferenciado — tratamos todos como "Seguros" exceto Saúde.
- Materializar `ScheduledTask` em `TaskItem` (a descrição apenas fica salva no agendamento).
