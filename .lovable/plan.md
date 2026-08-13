# Remover coluna Número e ordenar por número do prefixo

## O que muda

1. **Aba Apólices**: a coluna "Número" sai da tabela (desktop) e o número deixa de aparecer no topo dos cards (mobile). A busca continua funcionando por nome do cliente.
2. **Ordenação por prefixo**: apólices e clientes passam a ser listados em ordem numérica crescente conforme o número do prefixo do nome do cliente (ex.: `AND.1` → `AND.9` → `AND.14` → `AND.100`). A ordenação é numérica, não alfabética, então 9 vem antes de 100.
3. Nomes sem prefixo reconhecível (variações como `OCT.138` e `AND-ELDA.134` também são lidas) vão para o fim da lista, ordenados alfabeticamente.
4. Quando o mesmo cliente tem várias apólices, elas ficam agrupadas e ordenadas entre si pela data de início (mais recente primeiro).

Nenhuma alteração no banco de dados nesta etapa: o prefixo permanece no nome do cliente e o campo número da apólice continua existindo no cadastro e no drawer de detalhes — apenas não é mais exibido na listagem.

## Detalhes técnicos

- Novo utilitário em `src/lib/` para extrair o número do prefixo (`^[A-Z]+(?:-[A-Z]+)?\.\s?(\d+)`), retornando `null` quando não houver match.
- `src/components/portfolio/PoliciesTab.tsx`: remove `<th>Número</th>` e a `<td>` correspondente, remove a linha do número no card mobile e aplica `.sort()` no resultado de `filtered` usando o número do prefixo de `clientName` com desempate por `startDate`.
- `src/components/portfolio/ClientsTab.tsx`: aplica a mesma ordenação sobre a lista filtrada, usando o nome do cliente.
