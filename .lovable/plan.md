## Objetivo
Tornar a sub-aba **Comissionamento** (dentro de Configurações) recolhível: ao carregar a página ela já vem fechada, e um clique no cabeçalho expande/recolhe o conteúdo.

## Mudança única
### `src/components/settings/CommissionConfigSection.tsx`
- Importar `{ Collapsible, CollapsibleTrigger, CollapsibleContent }` decomposed `@/components/ui/collapsible`.
- Envolver o `<Card>` inteiro com `<Collapsible defaultOpen={false}>`.
- Transformar o bloco do cabeçalho (ícone + título + descrição) em `<CollapsibleTrigger asChild>`, com estilo de cursor-pointer para indicar interatividade.
- Envolver o `<Tabs>` e todo o conteúdo interno com `<CollapsibleContent>`.
- Nenhuma outra lógica ou dados serão alterados.

### Fora de escopo
- Persistir estado de aberto/fechado (localStorage, URL, etc.).
- Alterar layout ou funcionalidade das config cards.
- Outras seções de Configurações.