# Pipeline de vendas: oportunidades não são salvas

## Diagnóstico (confirmado)

O quadro de pipeline nunca conversou com o banco:

- `src/lib/pipeline/opportunityStore.ts` guarda tudo em `useState`, iniciado com as oportunidades **mock** de `src/lib/mock/data.ts`. Criar, mover de etapa, editar, comentar ou anexar apenas altera memória — ao recarregar a página, tudo volta ao estado mock.
- A tabela `opportunities` já existe no banco e está **vazia** (0 registros), confirmando que nada foi gravado.
- O responsável usado é `team[0]` do mock, não o usuário logado.

É o mesmo problema que a aba Tarefas tinha; a solução é aplicar o mesmo padrão já usado lá.

## O que será feito

1. **Banco**: completar a tabela `opportunities` com os campos que a tela usa e que hoje só existem em memória (`closed_at`, histórico de etapas, campos de SLA) e criar as tabelas de apoio de mensagens/anexos/histórico da oportunidade, com regras de acesso iguais às das tarefas (vendedor vê o que é dele; admin e pós-venda veem tudo) e um bucket de arquivos para os anexos.
2. **Backend**: funções de servidor para listar, criar, editar, excluir, mover de etapa, comentar (texto e áudio), fixar/editar/excluir comentário e anexar arquivo.
3. **Store**: reescrever `opportunityStore.ts` para buscar do banco via TanStack Query e gravar por mutations, removendo os dados mock e o `me = team[0]`, passando a usar o usuário autenticado (`useCurrentUserId`).
4. **Telas**: ajustar `NewOpportunityDialog`, `EditOpportunityDialog`, `OpportunityDetailDialog`, `KanbanModule`, `PipelineAnalytics`, `QuoteHistory` e `MulticalcModule` para o novo formato (responsável por id em vez de iniciais, chamadas assíncronas, estados de carregando/erro com toast).
5. **Validação**: criar uma oportunidade, arrastar de etapa, comentar, recarregar a página e confirmar no banco que os registros persistiram.

## Notas técnicas

- Padrão de referência: `src/lib/tasks/tasks.functions.ts` + `tasks.mapper.ts` + `taskStore.tsx`.
- `assignee_id` passa a ser o `team_members.id` real; o campo `assignee` (iniciais) sai do modelo e as iniciais viram derivação de UI.
- `client_id` é preenchido quando a oportunidade nasce de um cliente existente; `client_name` continua como texto para leads novos.
- Reset do mock: como o quadro atual mostra dados fictícios, após a migração o pipeline começa vazio.
- Anexos e áudios passam a ir para storage com URL assinada, em vez de `URL.createObjectURL`.
