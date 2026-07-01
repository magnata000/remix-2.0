# Plano — Melhorias na página Carteira

## Análise

### Funcionalidades / arquivos impactados
- **Filtro seguradora**: `src/components/portfolio/PoliciesTab.tsx` (adicionar `Select`), reaproveitando a lista de seguradoras já existentes em `policies` (dedupe).
- **Campos monetários (Prêmio / Valor inicial Saúde)**: hoje usam `replace(/\D/g, "")`, o que remove `,` e `.` e trata o valor como inteiro (via `formatBRLInt`). Impacto em:
  - `src/components/portfolio/NewPolicyDialog.tsx` (Prêmio)
  - `src/components/portfolio/EditPolicyDialog.tsx` (Prêmio)
  - `src/components/portfolio/RenewPolicyDialog.tsx` (Prêmio)
  - `src/components/portfolio/BranchSpecificFields.tsx` (Valor inicial Saúde)
- **Editar/excluir documento com confirmação**: `src/components/documents/FolderTree.tsx` (componente `FolderRow`/`FileRow`). Já existe botão de editar/excluir por arquivo, mas: (1) o hover **não aparece** — o `<li>` não tem `group`; (2) a exclusão é imediata (sem confirmação).
- **Drag-and-drop de arquivos entre pastas**: hoje só há DnD de pastas. Falta em `documentStore.tsx` (`moveFile`) e em `FolderTree.tsx` (`draggable` no `FileRow`, drop handler no `TreeNode` aceitando também `application/x-file-id`).
- **Excluir apólice**: falta ação em `src/lib/portfolio/policyStore.tsx` (`deletePolicy`) e botão em `src/components/portfolio/PolicyDetailDrawer.tsx`. Efeitos colaterais a limpar: comissões da apólice (`commissionStore`) e pastas/arquivos da apólice (`documentStore`).

### Hooks / stores impactados
- `usePolicyStore` — novo `deletePolicy`.
- `useDocumentStore` — novo `moveFile`, `deleteFilesByPolicy`, `deleteFoldersByPolicy` (para limpeza em cascata).
- `useCommissionStore` — novo `deleteByPolicy` (limpeza em cascata).

### Riscos
- Cascata da exclusão de apólice: se não limparmos comissões e docs, viram órfãos e aparecem no Financeiro/Documentos sem apólice-mãe.
- Parser monetário: precisa lidar com `1.234,56` (BR) e `1234.56` (decimal ponto). Estratégia: remover todos os pontos, trocar `,` por `.`, `Number()`, arredondar a 2 casas.

---

## Plano de implementação

### 1. Filtro por Seguradora (`PoliciesTab.tsx`)
- Adicionar estado `insurer` (default `"all"`).
- Derivar a lista de seguradoras via `Array.from(new Set(policies.map(p => p.insurer))).sort()`.
- Novo `<Select>` no card de filtros, entre "Status" e "Ramo", com mesmo estilo (`rounded-xl bg-muted border-0`).
- Estender o filtro `useMemo` para respeitar `insurer`.

### 2. Campos monetários com decimais
- Criar helper em `src/lib/utils.ts` (ou novo `src/lib/format/currency.ts`):
  - `parseMoneyInput(raw: string): number` — aceita `100`, `100,5`, `100.5`, `1.234,56`, arredonda a 2 casas.
  - `formatBRLDecimal(n: number): string` — usa `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`, sempre 2 casas.
- Trocar em **NewPolicyDialog / EditPolicyDialog / RenewPolicyDialog**:
  - `onChange`: aceitar dígitos, `,` e `.` (regex `/[^\d.,]/g`), guardar string bruta.
  - `onBlur`: `parseMoneyInput` → `formatBRLDecimal` para exibir.
  - `onFocus`: mostrar valor cru (sem `R$`).
  - `premiumNum` = `parseMoneyInput(premium)`.
- Mesma troca no `BranchSpecificFields` para "Valor inicial (contratação)".
- `Policy.premium` já é `number`; passa a receber float (2 casas). `formatBRL` de `mock/data.ts` deve exibir com 2 casas — validar; ajustar se estiver truncando.

### 3. Editar/excluir documentos (arquivos) com confirmação — `FolderTree.tsx`
- No `<li>` do `FileRow`, adicionar `className="group ..."` para o `opacity-0 group-hover:opacity-100` funcionar (padrão dos cards de Tarefas).
- Botão editar: já funciona (rename inline) — apenas ajustar visual (aparece só no hover).
- Botão excluir: abrir `AlertDialog` (novo estado `confirmFile: DocFile | null`) antes de chamar `store.deleteFile`.

### 4. Drag-and-drop de arquivos
- `documentStore.tsx`: adicionar `moveFile(id, newFolderId)` que atualiza `folderId` e recalcula `policyId`/`clientName` a partir da nova pasta (garante consistência).
- `FolderTree.tsx`:
  - `FileRow`: `draggable`, `onDragStart` setando `application/x-file-id`.
  - `TreeNode.handleDragOver/Drop`: aceitar também tipo `application/x-file-id` e delegar a `store.moveFile` (mesmo highlight `ring-2 ring-brand/60`).
  - Continua funcionando entre pastas do mesmo cliente/apólice (raiz cliente ↔ raiz apólice, incluindo sub-pastas).

### 5. Excluir apólice
- `policyStore.tsx`: novo `deletePolicy(id)` que:
  - Se a apólice tem `renewedFromId`, limpa `renewedToId` da antecessora.
  - Se a apólice tem `renewedToId`, limpa `renewedFromId` da sucessora.
  - Remove a apólice.
- `commissionStore.tsx`: `deleteByPolicy(policyId)`.
- `documentStore.tsx`: `deleteByPolicy(policyId)` (folders + files onde `policyId === id`).
- `PolicyDetailDrawer.tsx`: novo botão "Excluir" (variant destructive, ao lado do "Editar dados" no header, com ícone `Trash2`), abre `AlertDialog` de confirmação. Ao confirmar: chamar cascata acima na ordem (comissões → docs → policy) e `onOpenChange(false)`.

---

## Arquivos modificados
- `src/components/portfolio/PoliciesTab.tsx` — filtro seguradora.
- `src/lib/utils.ts` (ou novo `src/lib/format/currency.ts`) — helpers monetários.
- `src/components/portfolio/NewPolicyDialog.tsx` — Prêmio com decimais.
- `src/components/portfolio/EditPolicyDialog.tsx` — Prêmio com decimais.
- `src/components/portfolio/RenewPolicyDialog.tsx` — Prêmio com decimais.
- `src/components/portfolio/BranchSpecificFields.tsx` — Valor inicial (Saúde) com decimais.
- `src/lib/mock/data.ts` — garantir `formatBRL` sempre com 2 casas (checar/ajustar).
- `src/components/documents/FolderTree.tsx` — hover buttons, confirm delete de arquivo, DnD de arquivo.
- `src/lib/documents/documentStore.tsx` — `moveFile`, `deleteByPolicy`.
- `src/lib/financial/commissionStore.tsx` — `deleteByPolicy`.
- `src/lib/portfolio/policyStore.tsx` — `deletePolicy`.
- `src/components/portfolio/PolicyDetailDrawer.tsx` — botão excluir + AlertDialog + cascata.

Sem alterações fora do escopo listado.
