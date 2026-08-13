# Migrar número da apólice para o número do prefixo do cliente

## Entendimento

Hoje cada cliente tem um prefixo do tipo `AND.99 - ` no nome, herdado da época em que a carteira era associada por iniciais. Hoje a atribuição é feita pelo campo vendedor da apólice, então o prefixo é redundante. O número dele, porém, é a numeração real da carteira e deve virar o número da apólice.

Situação verificada no banco: 138 clientes, todos com número extraível, em formatos variados (`AND.1 `, `AND. 111 - `, `AND.13 - `, `AND-ELDA.134 `, `OCT.138 `). 152 apólices, com clientes tendo de 1 a 5 apólices.

## O que será feito

1. **Gravar o número nas apólices**: cada apólice recebe o número do prefixo do cliente. Quando o cliente tem mais de uma apólice, a primeira fica com `99` e as seguintes com `99-2`, `99-3`, ... (ordenadas pela data de início, mais antiga primeiro).
2. **Limpar o nome do cliente**: remover o prefixo inteiro (`AND.99 - `, `AND. 99 `, `OCT.138 `, `AND-ELDA.134 `), deixando só o nome. Espaços extras e hífens soltos no início também são removidos.
3. **Ordenação**: a aba Apólices passa a ordenar por número crescente (numericamente, então 9 vem antes de 100) por padrão.
4. **Conflitos**: os dois números repetidos entre clientes (`138`: OCT.138 Edivania × AND. 138 Luiz Soares; `149`: Elias de Almeida duplicado) serão diferenciados com sufixo pela mesma regra e listados no final para você decidir caso a caso — nenhum cliente é apagado ou mesclado agora.

## Detalhes técnicos

- Extração do número: `regexp_match(name, '^[A-Z]+(?:-[A-Z]+)?\.\s?([0-9]+)')`; limpeza do nome pelo mesmo padrão seguido de `\s*-?\s*`.
- Atualização em dois comandos de dados (não é mudança de estrutura): um `UPDATE` em `policies.number` via CTE com `row_number() over (partition by client_id order by start_date, created_at)`, e um `UPDATE` em `clients.name`.
- Nenhum registro de comissão referencia `policies.number` por chave estrangeira, mas `commissions.policy_number` guarda uma cópia do número — será atualizado no mesmo passo para continuar consistente com a apólice.
- Antes de aplicar, exporto o mapeamento antigo → novo (`/mnt/documents/`) como backup para conferência.
- Frontend: ordenação numérica por `number` na lista filtrada de `src/components/portfolio/PoliciesTab.tsx`.
