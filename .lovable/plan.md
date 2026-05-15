## Mudança

Em `src/lib/multicalc/quoteStore.ts`, na função `effectiveStatus`, alterar o limite de expiração de 30 para 10 dias.

```ts
return ageDays > 10 ? "expirada" : "aberto";
```

## Comportamento

- Cotações com status `aberto` cuja versão mais recente tenha mais de 10 dias passam a aparecer como **Expirada** no histórico, comparações e em qualquer badge que use `effectiveStatus`.
- Versões antigas dentro de um grupo continuam exibindo o badge original (regra atual preservada).
- Cotações já marcadas como `ganha` ou `perdida` não são afetadas.

## Fora de escopo

- Não altera dados semeados (mock) — eles passam a refletir a nova regra automaticamente conforme as datas.
- Não cria job/agendador: a expiração continua sendo derivada (computada na leitura), o que é suficiente para o mock atual.
- Sem alteração visual no `StatusBadge` (o rótulo "Expirada" já existe).

## Critério de aceitação

Grupos `aberto` com `latest.createdAt` > 10 dias atrás aparecem como Expirada (ex.: grupo "Beatriz Costa", semeado com ~45 dias, já passa; "Carlos Lima" com 3 dias e "Rafael Mendes" com 5 dias continuam Em aberto).