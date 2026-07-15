
# Plano de execução aprovado — QW1 + QW2 + QW3

Escopo dos 3 quick wins do relatório de saúde, com os ajustes que você pediu (compat via `mock/data`, teamStore expandido, DailyModule endurecido, zero supressões).

Nada da lista de preservação é tocado: `DashboardModule.tsx`, `RenewPolicyDialog.tsx`, `ComingSoonOverlay.tsx`, `use-mobile.tsx`, `router.tsx`, `components/ui/*`, mocks `salesByMonth`/`insurerLogos`.

---

## QW1 — Extrair utilitários, tirar `team`/`formatDateShort` do mock

**Criar** `src/lib/format.ts` — casa nova do `formatDateShort` (função pura, sem dependência de mock).

**Criar** `src/lib/daily/dateUtils.ts` — `DAY_MS`, `daysBetween`, `relativeDueLabel`, `toneClass`, tipo `DueTone`. `relativeDueLabel` ganha guarda de `NaN` (retorna `"Data inválida"` tone `muted`) — endurece contra datas ruins vindas do futuro Cloud.

**Criar** `src/lib/daily/mentions.ts` — API pura:
- `TeamNameIndex` (Map imutável `lowercase name → id`)
- `buildTeamNameIndex(members)`
- `resolveMentionId(name, index)`
- `extractMentions(text, index)` — recebe o índice como parâmetro, evita O(n) por match
- `textMentionsUser(text, userId, index, cache?)` — encapsula o teste de menção + cache opcional

**Editar** `src/lib/mock/data.ts` — remover a implementação local de `formatDateShort` e substituir por `export { formatDateShort } from "@/lib/format";` com JSDoc `@deprecated` recomendando `@/lib/format`. Nenhum outro import legado quebra.

**Editar** `src/lib/team/teamStore.tsx` — expor:
- `getTeamNameIndex()` — helper síncrono, calcula uma vez a partir do `seedTeam` do mock, cacheado em módulo. Consumível por funções puras (fora de React).
- `useTeamNameIndex()` — hook derivado do `members` do provider (index reativo aos members do estado, útil para o dia em que houver CRUD real).

Nenhum consumidor atual é forçado a migrar de `import { team } from "@/lib/mock/data"` agora — a extração completa fica como próximo passo (fora deste QW). Este QW deixa a porta aberta.

## QW2 — Endurecer e otimizar o DailyModule

**Editar** `src/components/modules/DailyModule.tsx`:
- Remover as versões locais de `DAY_MS`, `daysBetween`, `relativeDueLabel`, `toneClass`, `nameToId`, `extractMentions` — passam a vir de `@/lib/daily/dateUtils` e `@/lib/daily/mentions`.
- Remover `import { team, formatDateShort } from "@/lib/mock/data"`. Passar a importar `formatDateShort` de `@/lib/format` e usar `useTeamNameIndex()` + `useTeam` para obter `members` (para o `authorId → name` da MentionsSection e para o nome do usuário logado no cabeçalho).
- `useMyTasks`: guardar `Number.isNaN(new Date(t.dueDate!).getTime())` antes de comparar/ordenar, ignorando datas inválidas em vez de deixá-las virar `NaN` no `sort`.
- `useMyMentions`: passar a receber o `teamIndex` do módulo (via prop / closure) — o `mentionCache` fica local ao memo, como já está, mas `resolveMention` deixa de ser O(n).
- `useAgeBandChanges`: manter casamento por `clientName` (o schema atual não tem `clientId` em `Policy`), mas comentar como dívida a resolver com o schema real do Cloud.
- Passar `currentUserId` como prop das seções que dependem dele em vez de cada uma chamar `useCurrentUserId()`.
- Manter `SectionCard`/`EmptyState` locais (conforme sua diretriz anterior).

## QW3 — Zerar as 8 supressões

**`src/lib/multicalc/quoteStore.ts`** (2 supressões) — substituir os dois `@ts-expect-error dynamic` por um acessor tipado:
```ts
function getField(data: QuoteFormData, path: string): string {
  const [g, k] = path.split(".") as [keyof QuoteFormData, string];
  const group = data[g] as Record<string, string | undefined>;
  return String(group[k] ?? "");
}
```
Usar em `computeDiff`.

**`src/components/tasks/TasksBoard.tsx:53`** — trocar `useEffect(..., [])` + disable por guarda com `useRef` (`workflowsRanRef`), listar todas as deps reais (`defaultColumnId`, `policies`, `tasks`, `bulkAddTasks`); o ref garante rodar-só-uma-vez.

**`src/components/tasks/NewTaskDialog.tsx:55`** — inline o corpo do `reset` dentro do próprio `useEffect`, evitando a dependência instável em `reset` (mantém deps `[open, task]` sem disable, pois todas as demais referências são setters do `useState` estáveis).

**`src/components/pipeline/NewOpportunityDialog.tsx:65`** — mesmo padrão: inline o reset dentro do effect (ou envolver `reset` em `useCallback` com deps explícitas e adicioná-la).

**`src/components/portfolio/BranchSpecificFields.tsx:73`** — capturar `p.setHealthAnniversary` em um `useRef` atualizado a cada render; o effect depende só de `p.branch`, `p.startDate`, `p.anniversaryTouched` — sem disable, sem risco de loop caso o pai não memoize o setter.

**`src/components/shared/AudioRecorder.tsx:33`** — mover `previewUrl` para um `useRef<string | null>` atualizado em cada set; effect de cleanup passa a não ter deps externas e roda unicamente no unmount, sem disable.

## Verificação final

1. `bunx tsgo --noEmit` — deve continuar limpo.
2. `rg -n "eslint-disable|@ts-ignore|@ts-expect-error" src -g '!ui/*' -g '!routeTree*'` — deve retornar **zero** ocorrências fora de `routeTree.gen.ts`.
3. Console do preview sem `Hydration failed` ao abrir `/`.
4. Playwright headless para screenshot da Daily e conferir que o layout não regrediu.

Se quiser, digo "pode ir" e eu executo a bateria toda em uma rodada, sem parar no meio.
