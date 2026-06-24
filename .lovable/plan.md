## Observação

Você escreveu "Página Kanban" no título, mas todos os itens são da **Página Carteira** — vou tratar como Carteira.

---

## 1. Scroll na lista de clientes — Nova Apólice

**Arquivo:** `src/components/portfolio/NewPolicyDialog.tsx`

O `CommandList` dentro do `Popover` não tem altura máxima definida, então cresce até estourar. Adicionar `className="max-h-[280px] overflow-y-auto"` no `CommandList` para habilitar scroll quando a lista de clientes ficar longa.

## 2. Sub-tipo de Consórcio: Imóvel ou Auto

**Arquivos:** `src/lib/mock/data.ts`, `src/components/portfolio/BranchSpecificFields.tsx`, `src/components/portfolio/NewPolicyDialog.tsx`, `src/components/portfolio/EditPolicyDialog.tsx`

- Adicionar em `Policy`: `consortiumType?: "Imóvel" | "Auto"`.
- Em `BranchSpecificFields` (bloco Consórcio), adicionar um `Select` "Tipo" com opções `Imóvel` / `Auto`, ao lado de Grupo/Cota.
- Propagar estado `consortiumType` no `NewPolicyDialog` (e `EditPolicyDialog`) e incluir no `addPolicy(...)`/`updatePolicy(...)`.

## 3. Saúde: trocar label "Prêmio anual" → "Prêmio mensal"

**Arquivo:** `src/components/portfolio/NewPolicyDialog.tsx`

- Quando `branch === "Saúde"`, renderizar o campo com label **"Prêmio mensal *"** e placeholder mensal; nos demais ramos continua "Prêmio anual *".
- O valor segue salvo em `premium` (sem multiplicar por 12) — modelo recorrente mês a mês, conforme você confirmou. Aplicar a mesma troca de label no `EditPolicyDialog.tsx`.
- Não altero engine de comissões nem relatórios (fora de escopo). Aviso: relatórios anuais existentes vão considerar esse valor como anual — caso queira ajustar depois, é outra rodada.

## 4. Campo "Taxa de imposto" — permitir apagar sem voltar pro padrão

**Arquivo:** `src/components/portfolio/PolicyTaxOverrideFields.tsx`

Hoje `handleTaxaChange` faz `parseFloat` e, se der `NaN` (campo vazio), seta `taxaImposto = undefined`, o que faz o `effectiveTaxa` voltar pro padrão da seguradora (11,5). Mudanças:

- Introduzir estado local `taxaDraft: string` espelhando o input; quando o usuário digita, atualizamos `taxaDraft` livremente (inclusive vazio).
- `setTaxaImposto` só dispara em valores válidos `> 0`; vazio mantém `taxaImposto = undefined` mas o input mostra string vazia (não 11,5).
- No `submit` do `NewPolicyDialog`/`EditPolicyDialog`, se `effectiveLiquida === true` e `(taxaImposto ?? defaults.taxaImposto) <= 0`, bloquear com erro "Taxa de imposto deve ser maior que zero".

## 5. Redesign clean do bloco "Imposto sobre comissão"

**Arquivo:** `src/components/portfolio/PolicyTaxOverrideFields.tsx`

Reduzir ruído visual:

- Remover a borda tracejada e o card externo; usar uma única linha compacta com `Switch` "Comissão líquida" + label.
- Quando ligado, mostrar inline à direita um input pequeno (`w-24`) com sufixo "%" para a taxa.
- Remover o texto longo "Padrão {seguradora}: ..."; substituir por um helper minúsculo abaixo: `Padrão {insurer} · 11,5%` (apenas o essencial).
- Mover o "Usar padrão" para um pequeno botão-link só visível quando `overriding`.

Resultado: 1 linha principal + 1 sub-linha de helper.

## 6. Datepicker de nascimento — Novo Cliente

**Arquivo:** `src/components/portfolio/NewClientDialog.tsx`

Substituir o `<Input type="date">` pelo mesmo padrão usado em `BranchSpecificFields` (campo Nascimento dos Beneficiários):
- `Popover` + `Calendar` (`mode="single"`, `captionLayout="dropdown"`, `fromYear={1920}`, `toYear={ano atual}`, `pointer-events-auto`).
- Trigger com `Button variant="outline"` exibindo a data no formato `dd/mm/aaaa` (via `formatDateShort`) ou "Selecionar".
- Estado continua ISO `yyyy-mm-dd` para o schema Zod existente.

## 7. Drawer do cliente → abrir Drawer da apólice ao clicar

**Arquivos:** `src/components/modules/PortfolioModule.tsx`, `src/components/portfolio/ClientDetailDrawer.tsx`, `src/components/portfolio/PoliciesTab.tsx`

Hoje `ClientDetailDrawer` já aceita `onOpenPolicy` mas o `PortfolioModule` não passa. O `PolicySheet` (drawer das apólices) está privado dentro do `PoliciesTab`.

- Extrair `PolicySheet` de `PoliciesTab.tsx` para um arquivo próprio `src/components/portfolio/PolicyDetailDrawer.tsx` (mesma implementação, prop `policy | null`).
- `PoliciesTab` passa a importar de lá.
- `PortfolioModule` controla um novo estado `selectedPolicy: Policy | null`, renderiza `<PolicyDetailDrawer />` no nível do módulo e passa `onOpenPolicy={(p) => { setSelectedClient(null); setSelectedPolicy(p); }}` para o `ClientDetailDrawer`.
- Ao fechar o policy drawer, limpa o estado. Clique do cliente dentro do policy drawer (já existe via `Row "Cliente"`?) pode ser estendido depois se quiser bidirecional.

## 8. Novos campos no Drawer das Apólices (Saúde e Consórcio)

**Arquivo:** `src/components/portfolio/PolicyDetailDrawer.tsx` (após extração no item 7)

Na aba **Detalhes**, abaixo do bloco existente, renderizar condicionalmente:

**Quando `policy.branch === "Saúde"`:**
- `Row` "Categoria do plano" → `policy.healthCategory` (ou "—").
- `Row` "Coparticipação" → "Sim" / "Não" (a partir de `policy.healthCoparticipation`).
- Sub-bloco "Beneficiários" listando cada `policy.beneficiaries[]` em cards compactos (Nome · Título · Nascimento + idade · CPF). Reusar `calcAge` do ClientDetailDrawer.

**Quando `policy.branch === "Consórcio"`:**
- `Row` "Grupo" → `policy.consortiumGroup`.
- `Row` "Cota" → `policy.consortiumQuota`.
- `Row` "Tipo" → `policy.consortiumType` (novo campo do item 2).

---

## Fora de escopo

- Recalcular relatórios anuais existentes em função do prêmio mensal de Saúde (item 3).
- Refatorar `commissionEngine` para o novo `consortiumType`.
- Edição inline desses novos campos no drawer (segue pelo `EditPolicyDialog`).
