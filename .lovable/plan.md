## Feedback — entendi o pedido

Os documentos de cada apólice hoje são criados com 3 subpastas genéricas (`Proposta`, `Boletos`, `Endossos`) e uma raiz nomeada `Apólice {número} — {ramo}`. Você quer dois ajustes:

1. **Hierarquia específica por tipo de produto** ao criar a apólice (Saúde, Seguros, Consórcio), substituindo o template genérico atual.
2. **Prefixo do tipo de produto no nome da raiz** na aba Documentos do drawer de Clientes — por exemplo `Seguros · Apólice 12345 — Auto` em vez de só `Apólice 12345 — Auto`.

Mapeamento de ramo → produto:
- `Saúde` → **Saúde**
- `Consórcio` → **Consórcio**
- `Auto`, `Vida`, `Residencial`, `Empresarial` → **Seguros**

---

## Templates de pasta

**Saúde** (estrutura fixa, criada uma vez por apólice)
```text
Saúde
├── Documentação Preliminar
│   ├── Empresa
│   ├── Titular
│   ├── Beneficiários
│   ├── Cartas de Permanência e Carteirinhas
│   ├── Documentação Complementar
│   └── Informações Pessoais
└── Pós-venda
    ├── Acesso
    ├── Cotações
    ├── Proposta Contratada
    ├── Demonstrativos
    └── Outros
```

**Seguros** (estrutura por ano vigente — novo ano a cada renovação)
```text
{Ramo}  (ex.: Auto, Vida, Residencial, Empresarial)
└── {Ano vigente}   (ex.: 2026)
    ├── Boletos
    ├── Cotações
    ├── Endossos
    └── Proposta Contratada
```

**Consórcio**
```text
Consórcio
└── Geral
```

---

## Mudanças técnicas

### `src/lib/documents/documentStore.tsx`

- Novo helper `productOf(branch)` → `"Saúde" | "Seguros" | "Consórcio"`.
- Nova função `buildPolicyTree(rootId, policyId, clientName, branch, year)` que devolve a árvore de subpastas conforme o produto.
- `ensurePolicyRoots` passa a aceitar `startDate` (para extrair o ano) e:
  - cria a raiz da apólice com nome `"{Produto} · Apólice {número} — {ramo}"` (ex.: `Seguros · Apólice 12345 — Auto`, `Saúde · Apólice 9988 — Saúde`, `Consórcio · Apólice 7777 — Consórcio`);
  - aplica o template correto a partir do produto;
  - para **Seguros**, se a raiz já existe (renovação), apenas adiciona uma nova subárvore do ano vigente caso ainda não exista — mantendo os anos anteriores intactos.
- `seed()` reescrita: ao gerar fixtures, usar o template novo por produto (em vez do array `["Proposta", "Boletos", "Endossos"]`) e o novo nome de raiz com prefixo.

### `src/components/portfolio/RenewPolicyDialog.tsx`

- Continuar chamando `ensurePolicyRoots` passando o `startDate` da nova vigência para que, em Seguros, a nova pasta de ano seja adicionada à raiz existente.

### `src/components/portfolio/NewPolicyDialog.tsx`

- Passar `startDate` no `ensurePolicyRoots` (já tem o dado).

### Sem alterações

- `FolderTree.tsx`, `ClientDetailDrawer.tsx`, `PoliciesTab.tsx` — a UI já é genérica e renderiza qualquer hierarquia.
- Tipos de `DocFolder` permanecem iguais (a árvore é só dado).

---

## Fora de escopo

- Bloquear renomear/excluir as subpastas do template (continua livre como hoje, exceto raízes).
- Migrar dados reais de apólices que já existiam antes desta mudança (apenas o seed é regenerado).
- Aplicar o prefixo de produto fora da aba Documentos (ex.: na lista de Apólices).
