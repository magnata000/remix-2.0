# Campos condicionais por ramo + Comissão em apólices

Acrescentar campos extras nos formulários de apólice (Nova e Editar) sem alterar a estrutura atual. Os campos comuns continuam idênticos; os novos aparecem condicionalmente.

## 1. Modelo de dados (`src/lib/mock/data.ts`)

- Adicionar `"Consórcio"` ao tipo `Branch` e ao array `branches`.
- Estender `Policy` com campos opcionais (todos `?` para não quebrar dados existentes):
  - `commissionPct?: number` — % comissão (0–100).
  - **Saúde**: `healthAnniversary?: string` (dd/mm), `healthInitialValue?: number`, `healthCategory?: string`, `healthCoparticipation?: boolean`, `beneficiaries?: Beneficiary[]`.
  - **Consórcio**: `consortiumGroup?: string`, `consortiumQuota?: string`.
- Novo tipo `Beneficiary = { id; title: "titular"|"conjuge"|"filho"|"pai_mae"|"irmao"|"parente"|"outro"; titleCustom?: string; name; birthDate; cpf }`.

## 2. Componente compartilhado: `BranchSpecificFields`

Novo arquivo `src/components/portfolio/BranchSpecificFields.tsx` reusável por `NewPolicyDialog` e `EditPolicyDialog`. Recebe `branch`, `status`, valores e setters.

Renderiza:

### Quando `branch === "Saúde"`
- **Valor inicial (contratação)** — input BRL com mesma máscara do prêmio.
- **Aniversário do plano** — input `dd/mm` editável; **pré-preenchido** a partir do `startDate` (dia/mês), recalculado se startDate mudar e o usuário ainda não tiver editado manualmente (flag `anniversaryTouched`).
- **Categoria contratada** — input de texto livre.
- **Coparticipação** — `Switch` Sim/Não.
- **Beneficiários** — lista dinâmica com botão "Adicionar beneficiário":
  - Linha por beneficiário: Select de Título + (campo texto extra quando Título = `parente` ou `outro`) + Nome + Data nascimento (Popover Calendar) com **idade calculada** exibida ao lado (`X anos`) + CPF (máscara `000.000.000-00`) + botão remover.

### Quando `branch === "Consórcio"`
- **Número do grupo** — input texto.
- **Número da cota** — input texto.

### Comportamento de Fim de vigência (apenas Saúde)
- Em Saúde, ocultar/desabilitar o campo `Fim vigência` do formulário **a menos que** `status === "cancelada"`. Quando cancelada, torna-se obrigatório.
- Remover a obrigatoriedade de `endDate` na validação quando `branch === "Saúde" && status !== "cancelada"`.
- O padrão do `NewPolicyDialog` de auto-setar `endDate = startDate + 1 ano` ao escolher início **não se aplica** a Saúde.

## 3. Campo Comissão (em todos os ramos)

Em ambos os diálogos, adicionar bloco abaixo de "Vendedor":
- Input `Comissão (%)` com máscara percentual (aceita inteiros e decimais, ex.: `12,5`).
- Ao lado (read-only): `Valor da comissão = prêmio × %` formatado em BRL, atualizado em tempo real.

## 4. Integração nos diálogos

### `NewPolicyDialog.tsx`
- Adicionar estados para todos os campos novos (commission, health*, consortium*, beneficiaries).
- Inserir `<BranchSpecificFields />` após o grid principal e antes do bloco Vendedor.
- Inserir bloco Comissão após Vendedor.
- Ajustar `addPolicy` para receber os novos campos.
- Ajustar validação de `endDate` conforme regra Saúde acima.

### `EditPolicyDialog.tsx`
- Mesmos estados + hidratação a partir de `policy` no `useEffect`.
- Mesmo `<BranchSpecificFields />` e bloco Comissão.
- Mesma regra de `endDate`.
- `updatePolicy` recebe os novos campos.

### `policyStore.tsx`
- Tipos `AddPolicyInput`/`Partial<AddPolicyInput>` já são `Omit<Policy, ...>`, então os novos campos opcionais passam automaticamente — sem mudança de lógica.

## 5. Fora de escopo

- Exibição dos novos campos em `ClientDetailDrawer`, tabela de apólices, drawer da apólice — apenas captura/edição agora.
- Cálculo de comissão em relatórios financeiros (`ReportTab`, `salesStats`) — fica para uma próxima iteração.
- Persistência além do store em memória já existente.
- Validações específicas de CPF (apenas máscara; sem verificar dígito verificador).

## Detalhes técnicos

- Máscara percentual: input controlado que aceita só dígitos e uma vírgula/ponto, normaliza para `number` interno.
- Idade: `Math.floor((Date.now() - birthDate) / 31557600000)`.
- Aniversário do plano: derivado via `useEffect` com guarda `anniversaryTouched` para não sobrescrever edição manual.
- `Beneficiary.id` via `crypto.randomUUID()`.
- Sem migrations (mock store), sem alterações em rotas, sem novos pacotes.
