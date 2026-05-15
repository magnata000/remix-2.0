## Objetivo

Remover o `TabsTrigger` **Comparar** que aparece ao lado de "Nova cotação" e "Histórico" no Multicálculo, mantendo apenas o botão **Comparar** ao lado dos filtros do Histórico.

## Mudanças

**`src/components/modules/MulticalcModule.tsx`**
- Remover o `<TabsTrigger value="comparar">…</TabsTrigger>` da `TabsList`.
- Manter o `<TabsContent value="comparar">` intacto — a view de comparação continua acessível porque o botão **Comparar** ao lado dos filtros chama `setTab("comparar")` via `goCompare()`.
- Ajustar o `TabsList` para 2 colunas no mobile (atualmente "Nova cotação" e "Histórico" usam `flex-1`, então nenhum layout extra é necessário).

## Critérios de aceitação

- A barra de abas exibe apenas **Nova cotação** e **Histórico**.
- Selecionar 2+ versões e clicar em **Comparar** (ao lado dos filtros) continua abrindo a tela de comparação.
- O botão **Voltar** dentro de `QuoteCompare` retorna corretamente para o Histórico.
