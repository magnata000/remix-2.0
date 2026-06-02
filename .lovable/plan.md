## Objetivo
No `ClientDetailDrawer` (wrapper lateral do cliente), remover as seções **Pipeline & cotações** e **Linha do tempo**, mantendo Contato, KPIs, Apólices vinculadas e as ações de rodapé.

## Alterações em `src/components/portfolio/ClientDetailDrawer.tsx`

1. Remover do JSX a `<Section title="Pipeline & cotações" ...>` inteira (incluindo o botão "Abrir no Quadro").
2. Remover do JSX a `<Section title="Linha do tempo" ...>` inteira.
3. Limpar código não utilizado após a remoção:
   - `useMemo` de `clientOpps`, `clientGroups`, `timeline`
   - tipo `TimelineEvent`
   - imports que ficarem sem uso: `usePipelineStore`, `useQuoteStore`, `commissions`, `useNavigation`, ícones `TrendingUp`, `KanbanSquare`, `Calculator` (verificar se `Calculator` ainda é usado no botão "Nova cotação" do rodapé — é, então manter), `Sparkles`, `ArrowRight`, `Calendar`
   - `goTo` do `useNavigation` (manter pois é usado no botão "Nova cotação" do rodapé → manter `useNavigation`)

## Validação
Abrir o drawer de um cliente: devem aparecer apenas Contato, KPIs, Apólices vinculadas e botões "Nova oportunidade" / "Nova cotação". As duas seções removidas não aparecem mais.