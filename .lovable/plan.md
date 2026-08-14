# Tarefas somem ao sair da página — causa e correção

## O que está acontecendo

O quadro de Tarefas nunca foi ligado ao banco. O `taskStore` guarda tudo em estado local do React (`useState`), sem nenhuma chamada ao backend — nenhum arquivo de tarefas referencia o banco. Ou seja: tarefas, colunas, agendamentos, comentários e anexos vivem apenas na memória da aba aberta. Ao navegar para fora e voltar, o provider remonta e começa vazio. Não é bug de RLS nem de exclusão de dados — os dados nunca chegaram a ser salvos.

Existe uma tabela `tasks` no banco (com responsável, coluna, ordem, prazo), mas ela não é usada pela interface e não cobre prioridade, cliente, SLA, comentários, anexos, histórico nem agendamentos.

## Solução

Persistir o quadro inteiro no banco, no mesmo padrão já usado em Carteira/Follow-ups (server functions + TanStack Query), mantendo as regras de acesso atuais.

### 1. Banco de dados

- `task_columns`: título, cor, ordem (com as 3 colunas padrão Demanda/Processando/Concluído criadas na migração).
- `tasks` (estender a existente): prioridade, nome do cliente, chave de origem para dedupe de automações, campos de SLA (prazo, horas, pausado em).
- `task_comments`: autor, texto, fixado, editado em/por.
- `task_attachments`: nome, tamanho, tipo, caminho no Storage, comentário vinculado.
- `task_timeline`: tipo do evento (criado/movido/comentário/anexo), autor, data, dados do evento.
- `scheduled_tasks`: título, descrição, responsável, prioridade, tipo (data/semana/recorrente), intervalo, dias da semana, período e regra de recorrência.
- Bucket de Storage privado `task-attachments` para arquivos e áudios, com acesso somente a usuários autenticados.
- Acesso: Admin e Pós-venda veem e gerenciam todas as tarefas; Vendedor vê e gerencia apenas as suas (mesma função `can_view_all` já usada em oportunidades). Comentários, anexos, histórico e agendamentos seguem a visibilidade da tarefa correspondente.

### 2. Camada de dados

- Novo `src/lib/tasks/tasks.functions.ts` com server functions autenticadas para listar o quadro completo e para criar/editar/mover/excluir tarefas, colunas, comentários, anexos, agendamentos e eventos de histórico.
- Upload de anexos e áudios vai para o Storage e grava o caminho; a interface passa a usar URL assinada em vez de `URL.createObjectURL`.

### 3. Interface

- Reescrever `taskStore.tsx` mantendo exatamente a mesma API pública (`addTask`, `moveTask`, `addMessage`, `togglePinComment`, `addScheduled`, etc.), trocando `useState` por consultas e mutações com invalidação de cache. Assim `TasksBoard`, `TaskCard`, `TaskDetailDialog`, `NewTaskDialog`, `ManageColumnsDialog`, `ScheduledTasksPanel` e a Daily continuam funcionando sem alteração.
- Expor `isLoading` para exibir estado de carregamento no quadro.
- Atualizar `docs/DATABASE_SCHEMA.md` com as novas tabelas.

## Observação

As tarefas criadas ontem não são recuperáveis — nunca saíram do navegador. A partir desta mudança tudo passa a ser gravado.
