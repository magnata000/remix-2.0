## Objetivo

Adicionar uma aba **Tarefas** dentro do módulo **Kanban** (rota `/`, módulo "kanban"), com identidade visual minimalista alinhada ao Pipeline de Vendas (cards, badges, `rounded-2xl`, paleta muted). Tudo em estado local (mock) — sem backend.

## Arquitetura

**Novos arquivos:**
- `src/lib/tasks/taskStore.tsx` — store React Context com `useState` mantendo:
  - `boardColumns: { id; title; color }[]` (3 colunas seed: Demanda `#64748B`, Processando `#D97706`, Concluído `#059669`)
  - `tasks: TaskItem[]` com `id`, `title`, `description`, `dueDate`, `priority`, `assigneeId`, `clientName?`, `columnId`, `createdAt`, `comments[]`, `attachments[]`
  - `scheduledTasks: ScheduledTask[]` (recorrências)
  - Ações: `addTask`, `updateTask`, `moveTask`, `deleteTask`, `addComment`, `addAttachment`, `addColumn`, `renameColumn`, `recolorColumn`, `deleteColumn`, `addScheduled`, `removeScheduled`.
- `src/components/tasks/TasksBoard.tsx` — board kanban com 3+ colunas, drag-and-drop (mesmo padrão do `KanbanModule`), barra de filtros, botões "Nova tarefa" e "Gerenciar etapas".
- `src/components/tasks/TaskCard.tsx` — card visual com badge de prioridade, prazo, avatar do colaborador, cliente, contador de comentários/anexos.
- `src/components/tasks/TaskDetailDialog.tsx` — modal rico com timeline/chat, menções `@`, drag-and-drop de anexos.
- `src/components/tasks/NewTaskDialog.tsx` — formulário (Título, Descrição, Prazo via Shadcn Datepicker, Prioridade, Colaborador, Cliente opcional com autocomplete).
- `src/components/tasks/ManageColumnsDialog.tsx` — renomear, adicionar, escolher cor (paleta muted de 6 cores), remover coluna.
- `src/components/tasks/ScheduledTasksPanel.tsx` — formulário de agendamento (avulsa/data específica com recorrência anual opcional; dias da semana; mensal/bimestral/trimestral) + lista "Tarefas Programadas Ativas".
- `src/components/tasks/MentionInput.tsx` — textarea controlada com detecção de `@` → popover de colaboradores filtrados; ao selecionar, renderiza `@Nome` destacado.

**Arquivos editados:**
- `src/components/modules/KanbanModule.tsx` — envelopar conteúdo atual num `<Tabs>` com 2 abas: **Pipeline de vendas** (board existente, intacto) e **Tarefas** (novo `TasksBoard`).
- `src/routes/index.tsx` (ou `__root.tsx`) — injetar o `TaskStoreProvider` no entry, ao lado dos demais stores.

## Detalhes por feature

### 1. Board + cores das colunas
- Header de cada coluna: chip arredondado `rounded-xl` com texto na cor da coluna + barra fina superior `h-1` na mesma cor. Layout `grid-cols-3` desktop, tabs mobile (mesmo padrão do Pipeline).
- Drag-and-drop nativo (HTML5) idêntico ao `KanbanModule` para consistência.

### 2. Barra de filtros
- `Select` Colaborador (lista `team` de `mock/data.ts`).
- Grupo de toggles Prioridade (multi: Alta/Média/Baixa) usando `ToggleGroup`.
- `Input` Cliente com autocomplete (`Command` do shadcn, filtra `clients` do mock).
- `Select` Criação (Mais recentes / Mais antigos).
- Estado local da aba; filtra `tasks` antes de distribuir nas colunas.

### 3. Nova Tarefa
- `Dialog` com formulário `react-hook-form` + `zod`.
- Datepicker shadcn (`Popover` + `Calendar`, `pointer-events-auto`).
- Prioridade renderiza badge no card:
  - Alta → `bg-destructive/15 text-destructive`
  - Média → `bg-warning/15 text-warning`
  - Baixa → `bg-info/15 text-info`
- Cliente: `Command` autocomplete sobre `clients` (opcional).

### 4. Card rico + Timeline/Chat
- `Dialog` com 2 colunas em desktop: esquerda com metadados (prazo, prioridade, colaborador, cliente, status/coluna), direita com timeline cronológica de eventos (criação, mudança de coluna, comentários, anexos).
- `MentionInput`: ao digitar `@`, abre `Popover` com lista de `team` filtrada pela substring após o `@`. Setas ↑/↓ + Enter selecionam; clique também. Inserção produz token `@Nome` salvo no texto; ao renderizar comentário, regex `/@([A-Za-zÀ-ÿ ]+?)(?=[\s,.!?]|$)/` destaca com `text-brand font-semibold`.
- Anexos: dropzone (`onDragOver`/`onDrop` + `<input type="file" multiple hidden>`). Cada arquivo vira `{ id, name, size, type, url }`. URL = `URL.createObjectURL(file)` (ponteiro local — leve, sem base64 inflado). Listado no chat como link clicável que abre em nova aba.

### 5. Gerenciar Etapas
- Botão engrenagem ao lado de "Nova tarefa" abre `Dialog`.
- Lista editável de colunas: input de título + swatch de cor clicável que abre paleta de 6 tons muted:
  `#64748B`, `#D97706`, `#059669`, `#7C3AED`, `#DB2777`, `#0EA5E9`.
- Botão "Adicionar coluna" anexa nova coluna ao final.
- Botão lixeira por coluna (com confirmação se houver tarefas; tarefas migram para a primeira coluna).

### 6. Tarefas Agendadas
- Aba interna ou painel lateral colapsável dentro de "Tarefas" — escolha: **botão "Agendamentos"** no topo da aba que abre `Sheet` lateral (mantém o board limpo).
- Formulário com `RadioGroup` para tipo:
  - **Data específica** → Datepicker + checkbox "Repetir anualmente".
  - **Dias da semana** → 7 toggles (D/S/T/Q/Q/S/S).
  - **Período** → Select Mensal/Bimestral/Trimestral + Datepicker de início.
- Campos comuns: Título, Colaborador, Prioridade.
- Lista "Tarefas Programadas Ativas" abaixo, com badge do tipo de recorrência e botão remover. (Sem materializar tarefas reais — apenas exibição/registro mock.)

### 7. Dados iniciais mockados
4–6 tarefas distribuídas:
- Demanda: "Renovar apólice Auto - João Silva" (Alta, vence em 2d, Carlos Lima)
- Demanda: "Coletar documentos PME - Rafael Mendes" (Média, 5d, Ana Souza)
- Processando: "Cotação Residencial - Carlos Lima" (Alta, 3d, Mariana Alves)
- Processando: "Atualizar dados cadastrais - Beatriz Costa" (Baixa, 7d, Ana Souza)
- Concluído: "Envio de proposta - Mariana Alves" (Média, ontem, Carlos Lima)
- Com 1–2 comentários e 1 anexo mock em pelo menos 2 tarefas.

1 agendamento ativo de exemplo: "Felicitar aniversariantes" — data específica anual.

## Critérios de aceitação

- Em `/`, módulo **Kanban**: aparecem 2 abas no topo (**Pipeline de vendas**, **Tarefas**). A aba Pipeline mantém o board atual sem alterações.
- Aba Tarefas exibe 3 colunas com cores especificadas, cards com badges de prioridade, prazo formatado e avatar do colaborador.
- Arrastar card entre colunas atualiza o estado e persiste durante a sessão.
- Filtros (Colaborador, Prioridade, Cliente, Ordenação) atualizam os cards em tempo real.
- "Nova tarefa" abre modal funcional; ao salvar, card aparece na coluna inicial.
- Clicar em card abre modal com timeline; digitar `@` no input abre popover de colaboradores filtráveis; selecionar destaca `@Nome` no comentário enviado.
- Drag-and-drop de arquivo no modal adiciona link clicável à timeline.
- "Gerenciar etapas" permite renomear, adicionar (com seletor de 6 cores) e remover colunas.
- Botão "Agendamentos" abre `Sheet` com formulário e lista de programações.
- Build TypeScript limpo (`tsc --noEmit` ok no automated check).

## Observações técnicas

- Reutilizar componentes shadcn já presentes: `Tabs`, `Dialog`, `Sheet`, `Popover`, `Command`, `Calendar`, `ToggleGroup`, `RadioGroup`, `Select`, `Badge`, `Avatar`, `Checkbox`, `DropdownMenu`.
- Persistência: apenas `useState` na sessão (mock). Sem localStorage para manter alinhamento com os outros stores.
- Sem alterações no Pipeline existente, no Multicálculo ou em outros módulos.
