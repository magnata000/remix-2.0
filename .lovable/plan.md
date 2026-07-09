## Ajustes na aba Relatório e Configurações

### 1. Configurações → DRE & Impostos

- Remover a subseção "Alíquotas de impostos" (bloco destacado com os dois inputs de % e o texto explicativo) do arquivo `src/components/settings/DreConfigSection.tsx`.
- Remover a seção (classificação de categorias como custo/despesa operacional).
- Será criado outra feature posteriormente para inserir os impostos, para serem contabilizados no DRE.

### 2. Gráfico "Evolução Financeira" (ReportTab)

- Remover as abas de filtro (`Mês anterior` / `Ano anterior` / `Acumulado`) e o estado `evolTab`.
- Manter apenas as linhas de Receita e Lucro no período. Remover linhas comparativas (`compReceita`, `compLucro`) e a lógica de acúmulo.

### 3. Gráfico "Despesas por Categoria" (ReportTab)

- Remover o `Select` de mês no cabeçalho e o estado `pieMonth`.
- Passar a considerar todas as despesas dentro do `range` global (respeitando o filtro global de período), somando por categoria.
- Atualizar subtítulo para refletir o período selecionado (ex.: "No período selecionado").

### Arquivos afetados

- `src/components/settings/DreConfigSection.tsx`
- `src/components/financial/ReportTab.tsx`

Nenhum outro módulo/store precisa ser alterado.