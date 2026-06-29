## Objetivo
Corrigir a aba **Repasses de Vendedores** (Financeiro) — hoje aparece vazia/quebrada — e reposicionar o seletor de colaborador como **filtro global** no topo da página.

## Bugs identificados

1. **KPIs e histórico sempre vazios.** O filtro exige `c.status === "pago" && c.paidAt`, mas as comissões do seed marcadas como "pago" (em `src/lib/mock/data.ts`) não têm `paidAt`. Resultado: nenhum repasse aparece, mesmo com dados.
2. **Apólices sem `assigneeId`.** As `curatedPolicies` e `extraPolicies` do seed não definem `assigneeId`, então `computePayout` retorna 0 para tudo — nenhum total se acumula por vendedor.
3. **`Select` com value `""`.** O estado inicial `useState(sellers[0]?.id ?? "")` pode ficar vazio antes da hidratação do `TeamProvider`; Radix `Select` quebra com value vazio. Precisa de fallback via `useEffect` quando a lista de vendedores muda.
4. **Seletor fora de lugar.** O `Select` de vendedor está dentro do card "Histórico", mas controla também o cálculo conceitual de repasse — confunde o usuário.

## Mudanças

### 1. `src/lib/mock/data.ts`
- Backfill: distribuir `assigneeId` (rotacionando entre os membros do time) em `curatedPolicies` e `extraPolicies` para que os repasses tenham a quem ser atribuídos no demo.
- Para as comissões `status: "pago"` do seed, adicionar `paidAt` (usar o próprio `dueDate` como data de pagamento) para que apareçam no histórico do mês correspondente.

### 2. `src/components/financial/SellerCommissionsTab.tsx` — reestruturação
Nova hierarquia visual:

```text
┌──────────────────────────────────────────────────────┐
│ Filtro global: [Vendedor ▾]  [Mês ▾]   (sticky top) │
└──────────────────────────────────────────────────────┘
┌────────────── KPI do vendedor selecionado ──────────┐
│ Total a repassar · {Mês}    R$ XX.XXX,XX            │
│ Comissões pagas: N · Ramos atendidos: N              │
└──────────────────────────────────────────────────────┘
┌── Configuração de % (apenas a linha do vendedor) ───┐
│ Vendedor | Auto | Vida | Resid. | Empr. | Saúde |Cons│
└──────────────────────────────────────────────────────┘
┌────────────── Histórico de comissões pagas ─────────┐
│ Tabela atual (sem o seletor interno)                 │
└──────────────────────────────────────────────────────┘
```

Correções de comportamento:
- Mover `Select` de vendedor + `Select` de mês para um card de cabeçalho (`sticky top-0` opcional).
- Inicializar `sellerId` com `useEffect` quando `sellers` ficar disponível; se vazio, manter a mensagem de "Nenhum vendedor cadastrado".
- Substituir a grade de KPIs (uma por vendedor) por **um único card** focado no vendedor selecionado, com contagem de comissões e ramos atendidos no subtítulo.
- Tabela de % passa a mostrar **apenas a linha do vendedor selecionado** (mantém edição dos 6 ramos). Texto auxiliar deixa claro: "Editando percentuais de {Nome}".
- Histórico continua igual (já filtrado), só perde os selects do header.
- Manter o estado vazio do histórico, mas com mensagem mais explícita ("Nenhuma comissão paga para {Nome} em {Mês}").

### 3. Robustez
- Filtro de "pago no mês": aceitar `paidAt ?? dueDate` para definir a quais mês/ano a comissão pertence (evita o bug de comissões antigas marcadas como pagas sem `paidAt` ficarem invisíveis).
- `computePayout` permanece exigindo `status === "pago"`; sem `assigneeId` continua retornando 0 (não inventa repasse).

## Arquivos afetados
- `src/lib/mock/data.ts` (seed: `assigneeId` + `paidAt`)
- `src/components/financial/SellerCommissionsTab.tsx` (reestrutura e correções)

Sem alterações de schema, store ou regras de negócio fora dessa aba.