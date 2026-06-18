# Dados cadastrais do cliente em grid 2x2

## Problema
Hoje, na "Visão geral" do drawer do cliente, os 4 itens (telefone, e-mail, CPF/CNPJ, nascimento) usam `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. Em telas largas viram 1 linha de 4 colunas; em telas estreitas viram 1 coluna empilhada. Nenhum dos dois entrega o 2x2 desejado.

## Solução
Em `src/components/portfolio/ClientDetailDrawer.tsx`, alterar a seção de contato para usar `grid-cols-2` como padrão (2x2 fixo) e cair para `grid-cols-1` apenas em larguras muito estreitas, onde 2 colunas comprometem a legibilidade (e-mail e CPF longos cortariam).

- Antes: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2`
- Depois: `grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-4 gap-y-2`

Isso garante:
- 2x2 em praticamente todas as larguras do drawer (incluindo o desktop atual).
- Empilhamento em 1 coluna apenas em telas muito pequenas, preservando legibilidade.
- Sem alterações nas máscaras, no formato de exibição ou nos demais campos/KPIs.

## Fora de escopo
- KPIs, abas, documentos, modais de edição/criação.
- Estrutura dos `ContactRow`, ícones e textos.
