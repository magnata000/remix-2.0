
# Plano de Execução Aprovado — Refatoração pré-integração

Ajustes seguindo os dois refinamentos que você pediu:
- **Item 3.1 (extrair SectionCard)**: NÃO fazer. Cards permanecem locais em `DailyModule.tsx`.
- **Item 1.6 (deduplicar `useTaskStore`)**: só aplicar se limpo. No caso, exige prop drilling de `tasks` para `MentionsSection` → **mantido como está**, duas chamadas independentes à store.

Todo o resto listado no relatório de auditoria é executado.

---

## Passo 1 — Bug 1.1: Hydration mismatch na Daily

Arquivo: `src/components/modules/DailyModule.tsx`

- Trocar `import { useMemo, useState } from "react"` por `import { useEffect, useMemo, useState } from "react"`.
- Substituir `const now = useMemo(() => new Date(), [])` por:
  ```ts
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);
  ```
- `greeting` retorna `"Olá"` quando `now` é `null`; `dateLabel` fica `""` e o `Badge` de data só renderiza quando `dateLabel` existe.
- As seções que dependem de `now` (Tasks, Birthdays, Renewals, AgeBand) são renderizadas dentro de um `{now && (...)}`, evitando qualquer render server-side dependente de hora local.
- Efeito colateral positivo: SSR e primeiro paint do cliente renderizam HTML idêntico → some o warning `Hydration failed`.

## Passo 2 — Bugs 1.2, 1.3, 1.4: limpezas do DailyModule

Mesmo arquivo:
- **1.2** Remover `const myName = ...` e tirar `myName` das deps do `useMemo` em `useMyMentions`.
- **1.3** Em `MentionsSection`, remover o `useTaskStore()` local e trocar o `onClick` por `() => onOpenTaskId(e.taskId)` — o consumidor já faz o lookup.
- **1.4** Dentro de `useMyMentions`, envolver `extractMentions` num cache local `Map<string, string[]>` para não reprocessar o mesmo texto (descrição + comentários repetidos). Sem mudança visual.

## Passo 3 — Item 3.5: Header responsivo da Daily

Ainda em `DailyModule.tsx`, trocar o wrapper do cabeçalho:
```diff
- <div className="flex flex-wrap items-end justify-between gap-3">
+ <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
```
Adicionar `min-w-0` no bloco de texto e `shrink-0` no ícone `Sparkles` e no `Badge` de data. Padrão exigido pelo template para não quebrar em ~780px.

## Passo 4 — Item 2.4: rebaixar exports não usados

Nenhuma remoção, apenas troca de `export ...` por declaração local em símbolos que não são consumidos por outros arquivos (confirmado com `knip` + `rg`):

- `src/components/shared/SlaBadge.tsx` → `slaBorderClass`
- `src/components/shared/Timeline.tsx` → `formatTime`, `formatBytes`, `isImage`, `isAudio`, `AudioBubble`
- `src/components/shell/TopBar.tsx` → `modules` (mantido interno)
- `src/lib/daily/ageBands.ts` → `ANS_AGE_BANDS`, `bandOf`
- `src/lib/financial/dreConfigStore.tsx` → `classifyCategory`
- `src/lib/financial/reportMetrics.ts` → `taxInRangeByCompetence`, `expensesByCategory`, `expensesSplit`, tipo `RevenueLosses`
- `src/lib/pipeline/salesStats.ts` → `OPEN_STAGES`, `salesByMonthFromPipeline`, `revenueInMonth`, remoção da linha `export { MS_DAY }`
- `src/lib/tasks/recurrence.ts` → `expandOccurrences`
- `src/lib/multicalc/quoteStore.ts` → tipo `FieldDiff`
- `src/lib/mock/data.ts` → tipo `TeamMember`
- `src/components/multicalc/MulticalcWizard.tsx` → tipo `WizardCompletePayload`

Ficam intactos por serem consumidos em algum lugar (ex.: `ButtonProps` importado em `pagination.tsx`, `salesByMonth`/`insurerLogos` usados no `DashboardModule` preservado, mocks e etc).

## Passo 5 — Verificação

- `bunx tsgo --noEmit` para garantir zero erro de tipo.
- `bunx knip` para conferir redução da lista de exports.
- Smoke visual: Daily (aguardar montar, ver saudação/data), Carteira, Kanban, Financeiro, Configurações — nenhum arquivo de UI foi tocado além do header da Daily.
- Console limpo de `Hydration failed`.

---

## Preservação (não tocar)

- `src/components/modules/DashboardModule.tsx`
- `src/components/portfolio/RenewPolicyDialog.tsx`
- `src/components/shared/ComingSoonOverlay.tsx`
- `src/hooks/use-mobile.tsx`
- `src/router.tsx`
- Todos os componentes shadcn (`accordion`, `alert`, `carousel`, `chart`, ...)
- Todos os pacotes em `package.json`
- Mocks `salesByMonth` e `insurerLogos` em `src/lib/mock/data.ts`
- Cores, espaçamentos, tipografia, animações

Nada além dos passos 1–5 acima é executado.
