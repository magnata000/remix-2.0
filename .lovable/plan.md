# Edição de dados cadastrais nos Drawers

Adicionar um ícone de **lápis** (`Pencil` do lucide-react), discreto, no cabeçalho dos dois drawers laterais já existentes — Apólices e Clientes — para abrir um diálogo de edição dos dados cadastrais. Sem mexer em outras telas.

## UX

- Ícone `Pencil` (16px), botão `variant="ghost" size="icon"` pequeno, ao lado do título de cada drawer.
- Tooltip "Editar dados" no hover.
- Clique abre o diálogo de edição correspondente, pré-preenchido com os dados atuais. Salvar atualiza o store; o drawer reflete na hora.
- Diálogos espelham os "Novo cliente" / "Nova apólice" (mesmos campos, máscaras e validações), com título "Editar cliente" / "Editar apólice" e botão "Salvar alterações".

## Regras

**Cliente (`ClientDetailDrawer`)**
- Edita todos os campos do cadastro: nome, e-mail, telefone, CPF/CNPJ, data de nascimento.
- Mantém as mesmas máscaras já usadas no `NewClientDialog` (telefone, CPF/CNPJ, data).
- Validação de nome duplicado ignora o próprio cliente.

**Apólice (`PolicySheet` em `PoliciesTab`)**
- Edita: cliente, ramo, seguradora, prêmio anual, início/fim de vigência, status.
- **Número da apólice não é editável** (gerado pelo sistema, exibido só leitura).
- **Vínculos de renovação** (`renewedFromId`/`renewedToId`) **não são editáveis** — preservados ao salvar.
- Status `renovada` fica disponível apenas se a apólice já tem `renewedToId`; caso contrário, mantém as 4 opções normais.

## Arquivos

**Novos**
- `src/components/portfolio/EditClientDialog.tsx` — adaptação do `NewClientDialog` em modo edição.
- `src/components/portfolio/EditPolicyDialog.tsx` — adaptação do `NewPolicyDialog` em modo edição.

**Editados**
- `src/lib/portfolio/clientStore.tsx` — adicionar `updateClient(id, patch)` no contexto.
- `src/lib/portfolio/policyStore.tsx` — adicionar `updatePolicy(id, patch)` preservando `id`, `number`, `renewedFromId`, `renewedToId`.
- `src/components/portfolio/ClientDetailDrawer.tsx` — botão lápis no `SheetTitle` + estado `editOpen` + `<EditClientDialog>`.
- `src/components/portfolio/PoliciesTab.tsx` — botão lápis no `SheetTitle` do `PolicySheet` + estado `editOpen` + `<EditPolicyDialog>`.

## Fora do escopo
- Edição de documentos, apólices vinculadas ou oportunidades a partir do drawer.
- Auditoria/histórico de alterações.
