# Desmarcar versões selecionadas para comparação

Hoje, no Histórico do Multicálculo, é possível selecionar versões via checkbox para comparar. Para desmarcar, o usuário precisa abrir cada grupo e clicar novamente no checkbox. Vamos adicionar atalhos discretos.

## Mudanças

**`src/components/multicalc/QuoteHistory.tsx`**
- Adicionar prop `onClearSelection: () => void` (limpa tudo) ao tipo `Props`.
- Na barra de filtros, ao lado do botão "Comparar":
  - Quando `selected.length > 0`, exibir um botão `ghost`/`link` pequeno com ícone `X` e texto "Limpar seleção (N)". Estilo sutil: `text-xs text-muted-foreground hover:text-foreground`.
  - Quando `selected.length === 0`, não renderizar nada (mantém a UI limpa).
- Em cada item de versão (chip "v{n}"), quando `isSelected === true`, mostrar um pequeno botão ícone `X` (h-6 w-6, `variant="ghost"`, `text-muted-foreground`) ao final da linha — chama `onToggleSelect(v.id)`. Visível apenas quando selecionado, para não poluir.
- Tooltip/`title` em ambos: "Remover desta comparação" / "Limpar todas as seleções".

**`src/components/modules/MulticalcModule.tsx`**
- Criar handler `clearSelection = () => setSelected([])`.
- Passar como `onClearSelection` para `<QuoteHistory />`.
- Opcional: também resetar seleção ao concluir uma comparação? Não — manter comportamento atual; o usuário decide quando limpar.

## Detalhes técnicos
- Ícone: `X` de `lucide-react` (já em uso no projeto).
- Sem novos componentes; reutiliza `Button` existente.
- Sem mudanças de estado global — apenas o estado local `selected` em `MulticalcInner`.

## Critérios de aceitação
- Com 1+ versões selecionadas, aparece "Limpar seleção (N)" sutil ao lado do botão Comparar; ao clicar, todas são desmarcadas.
- Em cada versão selecionada, surge um `X` discreto que desmarca apenas aquela versão.
- Sem seleção, nenhum dos novos controles aparece.
- Restrição de ramos misturados continua funcionando normalmente.
