## Objetivo
No painel "Tarefas agendadas" (`ScheduledTasksPanel`), remover a opção de recorrência **Períodos** e enriquecer a opção **Data específica (avulsa)** com uma sub-opção de recorrência: Nenhuma, Mensal, Bimestral, Trimestral, Semestral, Anual — apresentada de forma sutil na UI.

## Alterações

### 1. `src/lib/tasks/taskStore.tsx`
- Expandir `PeriodKind` para `"mensal" | "bimestral" | "trimestral" | "semestral" | "anual"`.
- Remover `"periodo"` de `ScheduledKind` (passa a ser `"data" | "semana"`).
- Em `ScheduledTask`: remover o campo `yearly` (substituído por `period`) e manter `period?: PeriodKind` agora associado ao tipo `"data"`.
- Ajustar o seed (`sch1`) para usar `period: "anual"` em vez de `yearly: true`.

### 2. `src/components/tasks/ScheduledTasksPanel.tsx`
- Remover o `RadioGroupItem` "Períodos (mensal/bimestral/trimestral)" e todo o bloco condicional `kind === "periodo"` (incluindo o `<DatePick>` de início e o `<Select>` de período).
- Remover o estado `period` e `startDate` dedicados a "periodo".
- Em `kind === "data"`:
  - Substituir o checkbox "Repetir anualmente" por um seletor discreto de recorrência. Sugestão de UI sutil: uma linha pequena com label `Repetir` + um `Select` compacto (ou `ToggleGroup` pequeno) com as opções: **Não repetir, Mensal, Bimestral, Trimestral, Semestral, Anual**. Texto em `text-xs text-muted-foreground`, trigger com `h-8` e largura automática, alinhado à direita logo abaixo do seletor de data — sem destaque visual.
  - Default: "Não repetir".
- No `submit`, gravar `period` (quando ≠ "Não repetir") no `ScheduledTask`; remover `yearly`.
- Em `describeSchedule`, substituir `s.yearly ? " · todo ano"` por mapeamento de `period` → " · mensal" / " · bimestral" / " · trimestral" / " · semestral" / " · anual". Remover o ramo `s.kind === "periodo"`.
- No badge da lista de agendadas: remover o caso `"periodo"`; mostrar "Data" para `kind === "data"`.

## Validação
Abrir Tarefas agendadas: o radio "Períodos" não aparece. Em "Data específica", abaixo do seletor de intervalo há um pequeno controle "Repetir" com as 6 opções. Criar uma tarefa "Mensal" — aparece na lista com sufixo "· mensal". O seed "Felicitar aniversariantes" continua mostrando "· anual".
