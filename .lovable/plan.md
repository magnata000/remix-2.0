## Objetivo
Transformar o campo "Data" da opção "Data específica (avulsa)" em um seletor de intervalo (data inicial → data final), mantendo o comportamento atual quando o usuário selecionar apenas uma data.

## Comportamento esperado
- Ao abrir o popover do calendário, ele entra em modo `range`.
- Primeiro clique define a **data inicial** (e, implicitamente, a final igual a ela).
- Segundo clique em uma data diferente define a **data final**.
- Se o usuário fechar o popover sem escolher uma segunda data, a final permanece igual à inicial (ex.: `19/05 a 19/05`).
- O botão exibe o intervalo formatado: `19/05/2026 → 26/05/2026` (ou apenas a data quando início = fim).
- Repetir anualmente continua disponível e aplica-se ao intervalo inteiro.

## Mudanças técnicas

### 1. `src/lib/tasks/taskStore.tsx`
- Atualizar o tipo `ScheduledTask` para o caso `kind: "data"`:
  - Substituir `date?: string` por `startDate?: string` **e** `endDate?: string` (mantendo `yearly`).
  - Ajustar o `seedScheduled` para usar os dois campos.
- Nota: já existe um `startDate` usado pelo caso `"periodo"`. Para evitar conflito semântico, manter `startDate`/`endDate` apenas para `"data"` e renomear o do `"periodo"` para `periodStart` (ou manter `startDate` compartilhado — decidir na implementação para impacto mínimo; preferência: manter `startDate` compartilhado e adicionar `endDate` só para `"data"`).

### 2. `src/components/tasks/ScheduledTasksPanel.tsx`
- Substituir o estado `date: Date | undefined` por `range: { from?: Date; to?: Date } | undefined`.
- Criar um novo componente local `DateRangePick` (baseado em `DatePick`) usando `<Calendar mode="range" />` do shadcn.
  - Label do botão:
    - vazio → "Selecionar intervalo"
    - só `from` → `formatDate(from)` (final assumida igual)
    - `from` + `to` → `formatDate(from) → formatDate(to)`
- Validação no `submit`: se `kind === "data"`, exigir ao menos `range?.from`. Se não houver `to`, definir `to = from`.
- Passar para `addScheduled`: `startDate: range.from.toISOString()`, `endDate: (range.to ?? range.from).toISOString()`.
- Atualizar `describeSchedule` para o caso `"data"`:
  - Se `startDate === endDate`: `formatDate(startDate)` (comportamento atual).
  - Caso contrário: `formatDate(startDate) → formatDate(endDate)` + sufixo `· todo ano` quando `yearly`.

### 3. Limpeza
- Resetar `range` ao `undefined` após criar o agendamento (junto com os outros resets já existentes).

## Fora de escopo
- Não altera os fluxos "Dias da semana" nem "Períodos".
- Não altera a lógica de geração/expansão das ocorrências (apenas o armazenamento dos dois extremos do intervalo).
