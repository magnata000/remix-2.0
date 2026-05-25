
# Plano: Criar Apólice e Cliente a partir da Carteira

## 1. Novos stores (persistência em memória + seed dos mocks)

**`src/lib/portfolio/clientStore.tsx`**
- Provider + hook `useClientStore()`.
- Estado inicial = `clients` de `mock/data.ts`.
- API: `clients`, `addClient(input)` → gera `id` `c{timestamp}`.

**`src/lib/portfolio/policyStore.tsx`**
- Provider + hook `usePolicyStore()`.
- Estado inicial = `policies` de `mock/data.ts`.
- API: `policies`, `addPolicy(input)` → gera `id` e `number` no formato `APO-2026-XXXX` (próximo sequencial baseado no array atual).
- No `addPolicy`, dispara criação de pastas raiz no `documentStore` (Geral do Cliente se ainda não existir + pasta da apólice nova). Para evitar import circular, o componente que chama `addPolicy` também chama o `documentStore` na sequência — store fica puro.

Ambos providers montados em `src/routes/index.tsx`, acima de `DocumentStoreProvider`.

## 2. Migração de consumidores

Trocar imports diretos de `clients`/`policies` do mock pelos hooks dos novos stores em:
- `src/components/portfolio/ClientsTab.tsx`
- `src/components/portfolio/PoliciesTab.tsx`
- `src/components/modules/PortfolioModule.tsx` (counts)
- `src/components/portfolio/ClientDetailDrawer.tsx` (lookup de cliente + apólices)

Demais consumidores (Kanban, Multicálculo, Financeiro, Dashboard) continuam usando o mock estático — fora de escopo.

## 3. Diálogos de criação

**`src/components/portfolio/NewClientDialog.tsx`**
- `Dialog` centralizado + `react-hook-form` + `zod`.
- Campos: Nome, E-mail, Telefone, Documento (CPF/CNPJ).
- Validação: nome obrigatório (2–100), e-mail válido, telefone obrigatório (mín. 8), documento obrigatório.
- Submit → `addClient` → toast sucesso → fecha.

**`src/components/portfolio/NewPolicyDialog.tsx`**
- `Dialog` centralizado + `react-hook-form` + `zod`.
- Campos:
  - **Cliente** — combobox buscável (`Popover` + `Command`) listando clientes do `clientStore`.
  - **Ramo** — `Select` (Auto / Vida / Residencial / Empresarial / Saúde).
  - **Seguradora** — `Select` (Porto Seguro / Bradesco / SulAmérica / Allianz / Mapfre).
  - **Prêmio** — input numérico em BRL.
  - **Vigência início** — `DatePicker` (shadcn, `pointer-events-auto`).
  - **Vigência fim** — `DatePicker`, auto-preenchido com início +1 ano ao escolher início, editável.
  - **Status** — `Select` (ativa / pendente / vencida / cancelada).
  - **Vendedor** — `Select` populado com `team` de `mock/data.ts`.
- Número da apólice gerado automaticamente (não exibido no form).
- Submit → `addPolicy` → cria pastas no `documentStore` → toast → fecha.

## 4. Botões "+" nas abas

**`PoliciesTab`** e **`ClientsTab`**: header já existente da aba ganha um `Button` ícone `Plus` à direita (label "Nova apólice" / "Novo cliente" em telas md+, só ícone em mobile). Estado local `open` controla o respectivo dialog.

## Detalhes técnicos

- Validação: `zod` + `@hookform/resolvers/zod` (já em uso no projeto).
- Combobox: `Command` + `Popover` (shadcn), filtragem case-insensitive por nome.
- Datas armazenadas como `YYYY-MM-DD` (igual ao mock atual) via `date.toISOString().slice(0,10)`.
- Toasts via `sonner` (`toast.success`).
- Sem alteração em `mock/data.ts` — stores apenas o consomem como seed.

## Fora de escopo

- Edição/remoção de apólice ou cliente.
- Upload de documentos no momento da criação.
- Persistência real (Lovable Cloud) — fica em memória, igual aos demais stores.
- Atualização dos módulos Kanban/Multicálculo/Financeiro para consumir os novos stores.
