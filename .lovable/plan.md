## Objetivo
No painel "Tarefas agendadas", habilitar **edição** (e manter exclusão) das tarefas programadas já criadas, listadas em "Tarefas programadas ativas".

## Alterações

### 1. `src/lib/tasks/taskStore.tsx`
- Adicionar ao contexto a função `updateScheduled(id: string, patch: Partial<Omit<ScheduledTask, "id">>): void` que aplica patch parcial sobre o item correspondente em `scheduled`.
- Expor no `value`/tipos `Ctx` e incluir nas dependências do `useMemo`.

### 2. `src/components/tasks/ScheduledTasksPanel.tsx`
- Em cada `<li>` da lista de agendadas, adicionar um botão "Editar" (ícone `Pencil` do lucide) ao lado do botão de lixeira, com mesmo estilo `ghost` discreto.
- Ao clicar em "Editar":
  - Carregar os valores do item nos estados do formulário (`title`, `assigneeId`, `priority`, `kind`, `range` a partir de `startDate`/`endDate`, `repeat` a partir de `period` (`"nenhuma"` quando ausente), `weekdays` a partir de `weekdays.map(String)`).
  - Entrar em modo de edição via novo estado local `editingId: string | null`.
  - Rolar/focar topo do painel (opcional: `scrollIntoView` no título).
- Quando `editingId` está setado:
  - O botão principal passa a se chamar **"Salvar alterações"** e chama `updateScheduled(editingId, {...})` em vez de `addScheduled`.
  - Mostrar um botão secundário **"Cancelar"** (variant `outline`, rounded-xl) ao lado, que limpa `editingId` e reseta o formulário ao estado vazio default.
  - O `<SheetTitle>` ganha um pequeno sufixo "· editando" (sutil, `text-xs text-muted-foreground` ao lado), opcional — preferir mudar apenas o rótulo do botão para manter UI discreta.
- Após salvar ou cancelar, limpar `editingId` e resetar o form (`title`, `range`, `weekdays`, `repeat`).
- A função `submit` reúne a validação atual; reaproveitar a mesma validação para criação e edição. Em edição, montar o payload patch idêntico ao de criação (sem `id`).
- O item atualmente em edição: destacar de forma sutil com `ring-1 ring-brand/40` na `<li>` quando `editingId === s.id`.

## Validação
Abrir Tarefas agendadas → clicar no ícone de lápis em "Felicitar aniversariantes do mês" → o formulário acima é preenchido com os dados existentes; alterar o título e a recorrência para "Mensal" → clicar "Salvar alterações" → o item na lista reflete as mudanças e o form retorna ao estado vazio. Clicar lápis novamente e em seguida "Cancelar" → form limpo, item inalterado. Exclusão pelo ícone de lixeira continua funcionando.
