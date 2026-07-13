## Objetivo

Ocultar completamente o acesso à Multicálculo e às features relacionadas em Pipeline de Vendas, sem remover código — reativação futura será um único toggle.

## Abordagem: Feature Flag Central

Criar `src/lib/featureFlags.ts` exportando:

```ts
export const FEATURES = {
  multicalc: false, // aguardando desenvolvimento dos RPAs na nuvem
} as const;
```

Todos os pontos de acesso passam a checar `FEATURES.multicalc`. Reativar = trocar para `true`.

## Pontos de ocultação

**1. `src/components/shell/TopBar.tsx`**
- Filtrar o item `{ key: "multicalc", label: "Multicálculo" }` do array de navegação quando a flag estiver off. Tipo `ModuleKey` e componente `MulticalcModule` permanecem intactos.

**2. `src/routes/index.tsx`**
- Manter `<MulticalcModule />` e `QuoteStoreProvider` no código.
- Adicionar guarda: se `active === "multicalc"` e a flag estiver off, redirecionar para `"dashboard"` (proteção contra deep-link/estado residual).

**3. `src/components/modules/KanbanModule.tsx`**
- Esconder o botão "Cotar no Multicálculo" / "Abrir no Multicálculo" nos cards.
- Remover o sufixo "· vinculadas ao Multicálculo" do subtítulo do header.
- Esconder qualquer badge/indicador de vínculo com quoteGroupId enquanto a flag estiver off.
- Imports e lógica de `useQuoteStore` permanecem (dead code controlado pela flag).

**4. `src/components/pipeline/OpportunityDetailDialog.tsx`**
- Esconder o botão/CTA "Cotar no Multicálculo" e qualquer indicador visível de vínculo.
- Import de `useQuoteStore` permanece.

## Fora de escopo (preservado, sem alterações)

- `src/components/modules/MulticalcModule.tsx` — página inteira intacta.
- `src/lib/multicalc/quoteStore` — store intacta.
- `src/lib/tasks/taskStore.tsx` — referências a quoteGroupId nas tarefas permanecem (dados/lógica preservados; apenas UI de acesso é oculta).
- `SettingsModule.tsx` — se houver configuração relacionada, permanece; apenas checar se há CTA visível que precise da flag (verificarei na implementação).

## Reativação futura

Trocar `multicalc: false` → `true` em `src/lib/featureFlags.ts`. Nenhuma outra mudança necessária.
