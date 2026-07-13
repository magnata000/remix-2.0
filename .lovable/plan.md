## Objetivo

Substituir o diálogo enxuto de renovação por um `NewPolicyDialog` em **modo renovação**: todos os campos pré-preenchidos a partir da apólice de origem, preservando o vínculo (anterior marcada como "renovada" + nova apontando para ela).

## Mudanças

### 1. `NewPolicyDialog.tsx` — aceitar modo renovação

Adicionar prop opcional:

```ts
type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultClientName?: string;
  sourcePolicy?: Policy | null; // ← NOVO: quando presente, é renovação
};
```

Comportamento quando `sourcePolicy` está presente:

- **Título**: "Renovar apólice — {number}" (em vez de "Nova apólice"); adiciona `DialogDescription` mencionando o cliente/apólice de origem.
- **Pré-preenchimento no `useEffect` de abertura** (a partir de `sourcePolicy`):
  - cliente (`clientId`/`clientName`)
  - `branch`, `insurer`, `premium` (formatado), `status = "ativa"`, `assigneeId`
  - `startDate = sourcePolicy.endDate`; `endDate = startDate + 1 ano` (para ramos não-Saúde)
  - `commissionStr` a partir de `sourcePolicy.commissionPct`
  - Campos específicos por ramo (Auto/Vida/Residencial/Empresarial: `commissionScheme`, `commissionInstallments`; Saúde: `healthScheme`, `healthAnniversary`, `healthInitialValue`, `healthCategory`, `healthCoparticipation`, `beneficiaries`; Consórcio: `consortiumGroup`, `consortiumQuota`, `consortiumType`).
- **Submit em modo renovação**: em vez de `addPolicy(...)`, chamar `renewPolicy(sourcePolicy.id, payload)` do `usePolicyStore`. O payload passa a incluir os campos hoje ausentes no `RenewPolicyDialog` (assignee, comissões, dados por ramo). Se `renewPolicy` ainda não aceita todos esses campos, estendo a sua assinatura em `policyStore.tsx` para receber o mesmo payload que `addPolicy` (menos vínculo, que ele mesmo aplica). Mantém-se `ensurePolicyRoots` + `generateForPolicy` + toast "Renovação {number} criada".

### 2. `PolicyDetailDrawer.tsx` — trocar disparador

Remover uso do `RenewPolicyDialog`. Ao clicar em "Renovar", abrir o `NewPolicyDialog` passando `sourcePolicy={policy}`.

### 3. `RenewPolicyDialog.tsx`

Deixar o arquivo no repositório (não deletar), sem uso — preserva histórico caso queira reverter. Alternativamente pode ser removido; deixarei como está para não perder código.

### 4. `policyStore.tsx` — estender `renewPolicy` se necessário

Ajustar a assinatura de `renewPolicy` para aceitar os mesmos campos opcionais do `addPolicy` (assignee, commissionPct, commissionScheme/installments, campos de Saúde e Consórcio), preservando a lógica de vínculo (nova aponta para a anterior; anterior recebe status "renovada"). Sem quebra de chamadas existentes.

## Fora de escopo

- Não removo `RenewPolicyDialog.tsx` (fica como dead code opcional).
- Não altero visual do drawer além do handler do botão Renovar.
- Regra atual de esconder "Renovar" para ramo Saúde permanece.

## Riscos / cuidados

- Reset de estado do `NewPolicyDialog` no `useEffect` já depende de `open`; incluirei `sourcePolicy` nas dependências para evitar preencher com valores de "nova apólice" quando reabrir em modo renovação.
- Validações existentes permanecem (prêmio, datas). Campos específicos por ramo continuam obrigatórios conforme `BranchSpecificFields`.
