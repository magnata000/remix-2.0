## O que falta

1. **Sub-aba "Comissionamento" em Configurações** — CRUD visual de `CommissionConfig` (seguradora × produto).
2. **Flag de imposto nos formulários de apólice** — permitir override por apólice de `comissaoLiquida` e `taxaImposto`.

Ambos editáveis, com persistência em memória (mesmo padrão dos outros stores).

---

## 1. Sub-aba "Comissionamento" em `SettingsModule.tsx`

Nova `Section` (ícone `Percent` ou `Calculator`) listando todas as configs por seguradora, agrupadas. Como já são 5 seguradoras × 3 produtos = 15 configs, usar **abas internas por produto** (Auto / Saúde / Consórcio) e dentro de cada uma um card por seguradora.

**Cada card mostra/edita:**
- Switch **"Paga comissão líquida"** (`comissaoLiquida`) — texto auxiliar: "Seguradora debita imposto antes do repasse"
- Input **"Taxa de imposto (%)"** — habilitado só quando `comissaoLiquida = true`
- Inputs **"% mínimo"** e **"% máximo"** (faixa permitida pela seguradora) — relevante para Auto
- Input **"% recorrência mensal"** (`recorrenciaPct`) — relevante para Saúde
- Inputs do **agenciamento** (`agenciamento[]`) — N campos de % decrescentes, com botões `+`/`−` para adicionar/remover parcelas (Saúde)
- Select **"Esquema padrão"** (`defaultScheme`) — `esgotamento` / `parcela` / `agenciamento` / `unica` (filtrado pelo produto)

**Comportamento:**
- Edição inline; botão "Salvar" por card chama `updateConfig(insurer, product, patch)`
- Toast de confirmação
- Campos irrelevantes ao produto ficam ocultos (ex.: recorrência só aparece em Saúde; min/max só em Auto)

**Arquivo novo:** `src/components/settings/CommissionConfigSection.tsx` (mantém `SettingsModule.tsx` enxuto).

---

## 2. Flag de imposto nos formulários

Em `NewPolicyDialog.tsx`, `EditPolicyDialog.tsx` e `RenewPolicyDialog.tsx`, dentro da seção de Comissão já existente, adicionar:

- Bloco colapsável **"Imposto (sobrescrever padrão da seguradora)"**
  - Switch **"Comissão líquida"** (override de `policy.comissaoLiquida`)
  - Input **"Taxa de imposto (%)"** (override de `policy.taxaImposto`)
- Texto auxiliar mostrando o padrão herdado: `Padrão Porto Seguro · Auto: bruto (sem imposto)` — lido via `useCommissionConfigStore().getConfig(insurer, product)`
- Se o usuário não tocar, mantém `undefined` e o engine usa o padrão da seguradora.

---

## Detalhes técnicos

- **Stores já prontos**: `useCommissionConfigStore` já expõe `configs` e `updateConfig`. Nenhuma mudança no engine ou nos tipos.
- **Regeneração**: alterar config **não** regenera comissões já geradas (decisão consciente — evita reescrever histórico). Novas apólices passam a usar o config atualizado. Adicionar nota visual: "Alterações aplicam-se apenas a apólices futuras."
- **Override por apólice**: já é lido em `configForPolicy()` — basta expor no formulário.
- **Validação**: `pctMin ≤ pctMax`, `agenciamento` em % (0–100), `taxaImposto` em % (0–100).

---

## Arquivos afetados

- `src/components/modules/SettingsModule.tsx` — adicionar nova Section
- `src/components/settings/CommissionConfigSection.tsx` (novo) — toda a UI de configs
- `src/components/portfolio/NewPolicyDialog.tsx` — bloco de override de imposto
- `src/components/portfolio/EditPolicyDialog.tsx` — idem
- `src/components/portfolio/RenewPolicyDialog.tsx` — idem

## Fora de escopo

- Persistência em backend (continua em memória)
- Histórico de alterações de config
- Regeneração retroativa de comissões já lançadas
