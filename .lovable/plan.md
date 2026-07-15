## Objetivo
Subir de **9.1 → 9.5+/10** com dois ciclos independentes: limpeza cosmética + primeira bateria de testes unitários nos utilitários puros de domínio.

## Escopo protegido (não tocar)
`DashboardModule.tsx`, `RenewPolicyDialog.tsx`, `ComingSoonOverlay.tsx`, `use-mobile.tsx`, `router.tsx`, `components/ui/*`, `routeTree.gen.ts`.

---

## Fase 1 — Limpeza cosmética e dívida de lint

1. **Rodar `bun run format`** (Prettier já configurado) para zerar todos os erros de formatação pré-existentes reportados pelo `eslint-plugin-prettier`.
2. **Neutralizar warnings de `react-refresh/only-export-components`** nos stores mistos (`teamStore.tsx`, `clientStore.tsx`, `policyStore.tsx`, `commissionStore.tsx`, etc.) que exportam Provider + hooks + helpers no mesmo arquivo. Estratégia:
   - Onde o helper é pequeno (ex.: `buildInviteLink`, `getTeamNameIndex`), manter no arquivo e adicionar comentário `// eslint-disable-next-line react-refresh/only-export-components` **apenas** na linha do export não-componente — não em bloco.
   - Preferir mover helpers síncronos "puros" (ex.: `getInsurers`, `getBranches` já estão em `.ts` — OK) para arquivo irmão quando o custo for baixo. Não vou renomear arquivos protegidos.
3. Validar com `bun run lint` — meta: zero errors, zero warnings evitáveis.

## Fase 2 — Setup Vitest

1. Instalar devDeps: `vitest`, `@vitest/ui` (opcional), `@types/node` (já existe).
2. Criar `vitest.config.ts` mínimo compatível com o alias `@/*` do `tsconfig.json` — reusar `vite-tsconfig-paths` para resolver alias sem duplicar config.
3. Adicionar scripts em `package.json`:
   - `"test": "vitest run"`
   - `"test:watch": "vitest"`
4. Criar `src/test/setup.ts` (vazio por ora, ponto de extensão futuro).
5. Atualizar `eslint.config.js` para ignorar `coverage/` (se aparecer) — opcional, não bloqueante.

## Fase 3 — Testes unitários (utilitários puros)

Estrutura: cada arquivo testado ganha um vizinho `*.test.ts`.

### `src/lib/daily/dateUtils.test.ts` — `relativeDueLabel`
- `undefined` → `"Sem prazo"`, tone `muted`.
- ISO inválida → `"Data inválida"`, tone `muted`.
- Passado (-3d, -1d) → `"Atrasada Nd"`, tone `danger`.
- Hoje (mesmo dia, horas diferentes) → `"Hoje"`, tone `warning`.
- Amanhã → `"Amanhã"`, tone `warning`.
- +5d, +30d → `"Em Nd"`, tone `info`.
- Fronteira: `daysBetween` ignora horas (data no fim do dia vs início).

### `src/lib/daily/mentions.test.ts` — `buildTeamNameIndex`, `extractMentions`, `textMentionsUser`, `resolveMentionId`
- Índice lowercase: `"João Silva"` casa `"@joão silva"`.
- Match guloso: em `"@João Silva Santos"`, com apenas `"João Silva"` no time, retorna `"João Silva"` (maior prefixo casável).
- `@todos` sempre casa.
- Nome não cadastrado → não incluído.
- Múltiplas menções no mesmo texto.
- Acentos (À-ÿ) na regex.
- `textMentionsUser`: direto por id, via `@todos`, ignora outros.
- Cache: chamando duas vezes com o mesmo texto, `extractMentions` só é executado uma vez (spy).

### `src/lib/financial/commissionEngine.test.ts` — `generateCommissionSchedule`, `branchToProduct`, `expectedRecurrencesUntil`, `commissionKindLabel`
Fixtures inline (Policy + CommissionConfig mínimos).
- `branchToProduct`: Saúde→saude, Consórcio→consorcio, Auto/Vida/Residencial/Empresarial→auto.
- Policy `cancelada`/`vencida` → retorna `[]`.
- **Saúde agenciamento**: N parcelas = length do schedule, mensal, `amount = mensalidade * pct` (com/sem imposto).
- **Saúde vitalício**: `generateCommissionSchedule` → `[]` (recorrência gerada à parte).
- **Consórcio**: 1 parcela única, `amount = premium * (pct/100)`, `dueDate = startDate + 30 dias`.
- **Auto parcela**: N parcelas iguais, soma = `premium * pct`.
- **Auto esgotamento (default)**: 1 parcela, `dueDate = startDate + 30d`.
- **Imposto**: `comissaoLiquida: true` reduz por `(1 - taxaImposto)` e arredonda a 2 casas.
- **`expectedRecurrencesUntil`**:
  - Não-saúde → `[]`.
  - Começa após `schedule.length` meses (recorrência) ou `vitalicioStartInstallment - 1` (vitalício).
  - Respeita `existingDueDates` (não duplica).
  - Retorna a quantidade correta de meses até a `reference`.
- **`commissionKindLabel`**: cada branch + default `"Comissão"`.

## Fase 4 — Validação

```bash
bun run test         # todos passam
tsgo                 # zero erros
bun run lint         # zero erros
```

Metas de nota:
- Prettier limpo + warnings do react-refresh reduzidos: **+0.05**
- Bateria de testes cobrindo os 3 núcleos de lógica pura: **+0.35**
- **Nova nota estimada: 9.5/10**

---

## Detalhes técnicos

- **Vitest sem jsdom**: os utilitários testados são 100% puros (nenhum toca DOM/React). `environment: "node"` (default) é suficiente e mantém a suíte rápida.
- **Datas determinísticas**: nos testes de `relativeDueLabel` e `commissionEngine`, injetar `now` explicitamente ou construir datas com `new Date(2026, 6, 15)` — nunca depender de `Date.now()` livre.
- **`crypto.randomUUID` em `commissionEngine`**: os testes verificam propriedades (contagem, valores, kind), nunca os IDs literais. Sem necessidade de mockar `crypto`.
- **Aliases `@/*`**: `vite-tsconfig-paths` já está instalado e resolve para Vitest via `vitest.config.ts` que reusa o mesmo plugin.
- **Compat com o Vite 7 do projeto**: instalar `vitest@^2` (compatível com Vite 7 e Node 20+). Sem `@vitest/coverage-*` nesta fase — cobertura fica pro próximo ciclo.
- **Sem regressão de tipos**: nenhum arquivo de produção muda de assinatura — só formatação e testes adicionais.
