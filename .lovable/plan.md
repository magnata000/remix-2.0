# Corrigir datas aparecendo 1 dia antes

## O que está acontecendo (em linguagem simples)

Datas como nascimento do cliente e vigência da apólice são salvas no formato `"AAAA-MM-DD"` (só a data, sem hora). Quando o navegador converte essa string em data com `new Date("2026-06-15")`, ele assume **meia-noite em UTC** (fuso 0). Como o Brasil está em UTC−3, ao mostrar essa data no fuso local, o relógio "volta" 3 horas e cai no **dia anterior** (14/06). Por isso a UI mostra um dia a menos do que foi digitado.

Esse bug afeta apenas valores salvos como data pura (`AAAA-MM-DD`): aniversário do cliente, `startDate`/`endDate` de apólice. Campos com data+hora (caixa, despesas) usam ISO completo com fuso e já estão corretos.

## O que vou fazer

Ajustar **um único ponto**: o formatador `formatDateShort` em `src/lib/mock/data.ts`. Ele vai detectar quando a string é só data (`AAAA-MM-DD`) e construir o `Date` usando os componentes locais (ano, mês, dia) — sem passar por UTC. Para ISOs com hora, mantém o comportamento atual.

```ts
export const formatDateShort = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
```

## Onde o efeito aparece

- Portfólio → aniversário do cliente, vigência das apólices (listagem, drawer, edição).
- Não toca em store, schemas, mocks, nem em datas com hora (Caixa/Relatório continuam iguais).

## Arquivos alterados

- `src/lib/mock/data.ts` — só a função `formatDateShort`.
