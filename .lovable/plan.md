## Filtros na tabela Movimentações

Adicionar controles de filtro no header da tabela Movimentações (Financeiro > Caixa), ao lado do seletor de mês, para refinar a visualização rapidamente.

### Filtros propostos

1. **Tipo** (Select): Todos · Entradas · Saídas
2. **Status da comissão** (Select multi-opção): Todos · Pago · Pendente · Atrasado · Sem status (saídas/entradas manuais)

Padrão inicial: ambos em "Todos" (comportamento atual preservado).

### UX

- Filtros ficam no header do card "Movimentações", à direita do seletor de mês, em pílulas/`Select` compactos no mesmo estilo já usado.
- Botão sutil "Limpar filtros" aparece só quando algum filtro está ativo.
- Empty state existente é reutilizado quando o filtro zera os resultados ("Nenhuma movimentação neste mês.").
- Os KPIs do topo (Entradas/Saídas/Saldo) **continuam refletindo o mês inteiro** — não são afetados pelos filtros da tabela. Isso evita confusão entre "saldo real do mês" e "visão filtrada".

### Implementação técnica

Arquivo único: `src/components/financial/CaixaTab.tsx`.

- Dois estados locais: `typeFilter: "all" | "entrada" | "saida"` e `statusFilter: "all" | "pago" | "pendente" | "atrasado" | "none"`.
- Novo `useMemo` `filteredMonthMovements` derivado de `monthMovements` aplicando ambos os filtros. A tabela passa a iterar sobre ele.
- `summary` continua usando `monthMovements` (sem filtro), preservando KPIs.
- Selects reutilizam o componente shadcn `Select` já importado.

### Fora de escopo

- Filtro por intervalo de datas customizado, por cliente, por seguradora ou por valor.
- Persistir filtros entre sessões (URL/localStorage).
- Aplicar filtros aos KPIs ou ao Relatório.
