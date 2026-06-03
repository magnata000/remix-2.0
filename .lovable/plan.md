# Lógica de Renovação de Apólices

Implementar renovação no modelo **"nova apólice vinculada à anterior"**, alinhado ao mercado. Endossos e atualização do gráfico de Taxa de Renovação ficam fora desta entrega (próximos passos descritos no final).

## O que muda para o usuário

1. **Botão "Renovar"** no Drawer de detalhes da apólice (`PoliciesTab > PolicySheet`) passa a funcionar. Hoje ele é estático.
2. Ao clicar em **Renovar**, abre um diálogo de renovação pré-preenchido com os dados da apólice atual (cliente, ramo, seguradora, prêmio, vigência sugerida = fim atual → +1 ano). Usuário pode ajustar prêmio, seguradora, datas e status antes de confirmar.
3. Ao confirmar:
   - Cria-se uma **nova apólice** com novo número (`APO-AAAA-XXXX`), vinculada à anterior via `renewedFromId`.
   - A apólice **anterior** muda automaticamente para o status `renovada` (novo status, ver abaixo).
   - As pastas de documentos da nova apólice são criadas (mesmo fluxo do `NewPolicyDialog`).
   - Toast de sucesso com o novo número.
4. **Selo de "Renovação Nº X"** no header do Drawer quando a apólice fizer parte de uma cadeia (ex.: "2ª renovação"). Mostra também, de forma sutil, link/texto "Renovada de APO-2025-0007" para a anterior.
5. **Novo status visual** `renovada` no badge (cor neutra/info) — distinto de `vencida` e `cancelada`.
6. **Botão "Renovar" desabilitado** quando a apólice já tiver sido renovada (existe outra apólice com `renewedFromId = esta`), com tooltip "Já renovada em APO-XXXX-XXXX".

## Estrutura técnica

### 1. Modelo de dados (`src/lib/mock/data.ts`)

- Adicionar `"renovada"` ao tipo `PolicyStatus`.
- Adicionar dois campos opcionais em `Policy`:
  - `renewedFromId?: string` — id da apólice anterior que esta renovou.
  - `renewedToId?: string` — id da apólice que renovou esta (preenchido quando ocorre a renovação).
- Atualizar mocks de status (`statuses`) sem necessariamente popular cadeias seed (cadeias surgem via uso).

### 2. Store (`src/lib/portfolio/policyStore.tsx`)

Adicionar duas operações:

- `renewPolicy(sourceId, input)`:
  - Gera novo número via `nextPolicyNumber`.
  - Cria a nova apólice com `renewedFromId = sourceId`.
  - Atualiza a apólice de origem: `status = "renovada"` e `renewedToId = novaApolice.id`.
  - Retorna a nova apólice (para o caller criar as pastas de documentos).
- Helpers (selectores puros, podem ficar no store ou em `clientStats.ts`):
  - `renewalChainOf(policyId)` → array ordenado da cadeia (original → ... → atual).
  - `renewalIndexOf(policyId)` → posição na cadeia (0 = original, 1 = 1ª renovação, ...).
  - `isAlreadyRenewed(policyId)` → boolean.

### 3. Novo componente `RenewPolicyDialog`

Arquivo: `src/components/portfolio/RenewPolicyDialog.tsx`.

- Reaproveita a estrutura visual do `NewPolicyDialog` (mesmos campos, mesmo layout `rounded-2xl bg-muted`).
- Recebe `sourcePolicy: Policy` via props; pré-preenche todos os campos.
- Vigência sugerida: `startDate = sourcePolicy.endDate`, `endDate = +1 ano`.
- Status default: `ativa`.
- Botão primário "Confirmar renovação"; secundário "Cancelar".
- No submit chama `renewPolicy(sourcePolicy.id, input)` + `ensurePolicyRoots(...)`.

### 4. Integração no Drawer de apólice (`PoliciesTab.tsx > PolicySheet`)

- Adicionar estado `renewOpen`.
- Botão "Renovar" passa a `onClick={() => setRenewOpen(true)}`.
- Renderizar `<RenewPolicyDialog open={renewOpen} ... sourcePolicy={policy} />`.
- Desabilitar botão quando `isAlreadyRenewed(policy.id)`; mostrar tooltip apontando para o número da renovação.
- No header do Sheet, abaixo do número da apólice, mostrar de forma sutil:
  - Se `renewalIndexOf > 0`: chip discreto `2ª renovação`.
  - Se `renewedFromId`: linha pequena `Renovada de APO-XXXX-XXXX` (texto `text-xs text-muted-foreground`, clicável para abrir a anterior no mesmo Sheet).
- Adicionar cor para o novo status `renovada` em `statusColor` (ex.: `bg-info/15 text-info border-0`).

### 5. Demais lugares que tipam `PolicyStatus`

Garantir que o novo valor `"renovada"` não quebre os filtros/badges existentes:

- `PoliciesTab.tsx` (`statusColor`, `Select` de filtro) — adicionar opção "Renovada".
- `ClientDetailDrawer.tsx` (`policyStatusColor`) — adicionar cor.

## Fora do escopo desta entrega (próximos passos)

- **Gráfico Taxa de Renovação** no Dashboard: vai consumir esses dados via `% renovadas / vencidas no período` e variante incluindo canceladas (ambas decididas com você). Implementar quando definirmos onde exibir e o range de período.
- **Geração automática de oportunidade no Kanban** para apólices a ~60 dias do vencimento.
- **Endossos** (alterações em vigência sem nova apólice) — entrega futura.
