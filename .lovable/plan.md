## Auditoria — único consumidor estático restante

Varri todo o `src/` por imports de `commissions` do mock e por call sites de `getClientStats` / `listClientsWithStats`:

| Local | Lê comissões do… | Status |
|---|---|---|
| `commissionStore.tsx` | mock (seed inicial) | ✅ correto — é o seed |
| `clientStats.ts` (linhas 1 e 43) | **mock estático** | ❌ precisa migrar |
| `CaixaTab`, `ReportTab`, `MovementDetailsSheet` | `useCommissionStore()` | ✅ |
| `NewPolicyDialog`, `RenewPolicyDialog` | `useCommissionStore()` | ✅ |
| `DashboardModule`, `Timeline`, `ClientDetailDrawer` (corpo) | **não usam comissões diretamente** | ✅ nada a fazer |

→ O `ClientDetailDrawer` consome comissões só indiretamente via `getClientStats(clientName, clients, policies)`. Basta corrigir a fonte.

Status inicial das comissões geradas (`pendente` mesmo em renovação): mantido como está.

---

## Mudança a implementar

### 1. `src/lib/portfolio/clientStats.ts`

- Remover o import estático de `commissions` do mock.
- Adicionar `commissionsArr: Commission[]` como 4º parâmetro de `getClientStats` e 3º de `listClientsWithStats` (sem default — força call site a passar do store).
- `computeStats` passa a receber `commissionsArr` e usa-o no filtro `myCommissions`.

```ts
import { type Commission, ... } from "@/lib/mock/data";

export function getClientStats(
  clientName: string,
  clientsArr: Client[],
  policiesArr: Policy[],
  commissionsArr: Commission[],
): ClientStats | null { ... }

export function listClientsWithStats(
  clientsArr: Client[],
  policiesArr: Policy[],
  commissionsArr: Commission[],
): ClientStats[] { ... }
```

### 2. Call sites — passar `commissions` do store

- **`src/components/portfolio/ClientsTab.tsx`** (linha 62):
  ```ts
  const { commissions } = useCommissionStore();
  const all = useMemo(
    () => listClientsWithStats(clients, policies, commissions),
    [clients, policies, commissions],
  );
  ```
- **`src/components/portfolio/ClientDetailDrawer.tsx`** (linha 89):
  ```ts
  const { commissions } = useCommissionStore();
  // ...
  () => (clientName ? getClientStats(clientName, clients, policies, commissions) : null),
  // deps: [clientName, clients, policies, commissions]
  ```

### 3. Sem outras alterações

Dashboard, Timeline, ReportTab, CaixaTab já consomem o store. Engine e config permanecem intactos.

---

## Fora de escopo

- Refatorar `clientStats` para virar hook.
- Persistência das comissões geradas.
- Mexer em estatísticas que não envolvem comissões.
