# Correção: aniversariantes do dia não aparecem na Daily

## Diagnóstico (confirmado)

Existe hoje (17/08) uma aniversariante no banco: cliente com `birth_date = 1994-08-17`. Ela não aparece por causa de fuso horário, não por falta de dados.

O utilitário `isBirthdayToday` (e `ageAt`) em `src/lib/daily/ageBands.ts` faz `new Date("1994-08-17")`. Strings de data pura são interpretadas como UTC meia-noite; ao ler `getMonth()`/`getDate()` no fuso de São Paulo (UTC-3), a data volta como 16/08. Resultado: nenhum aniversário do dia bate.

O mesmo problema afeta `findBandChange` (troca de faixa etária ANS) e o cálculo de idade exibido.

## O que fazer

1. Em `src/lib/daily/ageBands.ts`, criar um parser local de datas (`YYYY-MM-DD` → `new Date(ano, mês-1, dia)`, com fallback para strings ISO completas) e usá-lo em `ageAt`, `isBirthdayToday` e `findBandChange`.
2. Aplicar o mesmo parser nos beneficiários (mesma função já é usada pela Daily para clientes e beneficiários de Saúde).
3. Cobrir com testes: aniversário no dia atual, véspera/dia seguinte, ano bissexto (29/02) e mudança de faixa ANS — no padrão dos testes existentes em `src/lib/daily/`.

## Detalhes técnicos

- Nenhuma mudança de schema, RLS ou consulta ao banco; o dado já chega correto como string `YYYY-MM-DD`.
- Nenhuma mudança visual nos cards; apenas a lógica de comparação de datas.
- Verificação: após o ajuste, o card "Aniversariantes do dia" deve listar a cliente com nascimento em 17/08 (idade 32).

## Fora do escopo

O nome do cliente ainda carrega o prefixo (`AND. 133 ...`) em alguns registros importados — limpeza de prefixo não faz parte desta correção.
