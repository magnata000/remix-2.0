# Corrigir edição da data de nascimento

## Problema (em linguagem simples)
O campo "Data de nascimento" usa uma máscara que, a cada tecla, pega só os dígitos e reformata `dd/mm/aaaa` da esquerda para a direita. Quando você apaga um número no meio (ex.: o "1" de `01/05/1960`), os dígitos da direita "sobem" para preencher o buraco — `0/05/1960` vira `00/51/960`. Isso obriga apagar tudo para alterar um único dígito.

## Solução
Substituir o input mascarado por `<Input type="date">` (seletor nativo de data do navegador) em ambos os modais. Vantagens:
- Edita qualquer dígito sem reflow.
- Já valida formato e calendário.
- Valor nativo é `AAAA-MM-DD`, exatamente o formato que o store espera — elimina as funções `maskDate`, `toISO`, `isoToMasked` desses arquivos.
- Continua respeitando "não pode ser futura" via `max={today}` e ano mínimo via `min="1900-01-01"`.

## Arquivos a alterar
- `src/components/portfolio/EditClientDialog.tsx` — estado `birthDate` direto em ISO; remover helpers de data; input `type="date"`.
- `src/components/portfolio/NewClientDialog.tsx` — mesma mudança.

## Fora de escopo
Nenhuma alteração em store, schemas, mocks, formatação de exibição ou outros campos (telefone/CPF mantêm máscara, pois não sofrem do mesmo problema de uso).
