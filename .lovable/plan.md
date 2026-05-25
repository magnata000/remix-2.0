
## Análise da página Carteira (estado atual)

Avaliei as três superfícies onde "Documentos" poderia entrar: drawer do **Cliente**, drawer da **Apólice**, e o **módulo Carteira** como um todo.

**Drawer do Cliente (`ClientDetailDrawer`) — já está denso.**
Hoje empilha verticalmente: cabeçalho com avatar + status, contato (3 chips), 3 KPIs, lista de apólices, lista de pipeline + cotações, linha do tempo de 10 eventos, e 2 botões de ação. É um `Sheet` de `sm:max-w-2xl` com scroll. Adicionar uma quarta seção "Documentos" (que precisa de árvore de pastas, ações de upload, renomear, excluir) **quebra o propósito da visão 360°**: a 360° é um resumo navegável, não um workspace. Documentos exigem altura, foco e múltiplas ações — incompatível com um drawer de resumo.

**Drawer da Apólice (`PoliciesTab` → Sheet de detalhes) — subutilizado.**
Hoje mostra só: badge de status, 4 linhas (cliente, seguradora, ramo, vigência), card de prêmio e 2 botões (Renovar/Imprimir). É raso, tem espaço sobrando, e — mais importante — **documentos pertencem semanticamente à apólice**, não ao cliente. Apólice é a unidade natural: cada apólice tem proposta, condições gerais, boleto, comprovantes, endossos.

**Módulo Carteira — coerente, mas só dois pontos de entrada.**
Tabs "Apólices" e "Clientes" funcionam bem. Não há visão transversal de arquivos (procurar "boleto de junho" entre todos os clientes hoje é impossível).

## Recomendação

**Arquitetura híbrida em 2 camadas, sem inflar o drawer do cliente:**

1. **Anchor principal = drawer da Apólice.** Adicionar abas internas no Sheet de apólice: **Detalhes | Documentos**. É onde o usuário já está quando pensa "preciso do boleto desta apólice". O Sheet hoje está vazio — cabe perfeitamente.

2. **Visão consolidada = terceira aba no módulo Carteira: "Documentos".** Browser global de pastas para busca/organização cross-apólice. Estrutura sugerida: raiz com uma pasta por cliente → dentro, uma pasta por apólice → dentro, subpastas livres criadas pelo usuário (Boletos, Sinistros, Endossos, etc.). Não duplica dados — é a mesma árvore vista de outro ângulo.

3. **No drawer do Cliente:** apenas um **contador discreto** ("12 documentos") + link "Ver documentos →" que pula direto para a aba Documentos filtrada por esse cliente. Zero árvore de pastas dentro do 360°.

Por que essa divisão:
- **Coerência:** documentos vivem onde nascem (apólice), e a visão global existe pra quem busca transversalmente.
- **Sem redundância:** uma única árvore lógica, dois pontos de leitura.
- **Sem poluição:** drawer do cliente continua um resumo; drawer da apólice ganha utilidade real; Carteira ganha uma terceira aba consistente com o padrão atual.
- **Espaço:** o Sheet da apólice é `sm:max-w-md` hoje — vai para `sm:max-w-2xl` (igual ao do cliente) para acomodar a navegação de pastas confortavelmente.

## Plano de implementação

### 1. Modelo de dados (mock, em memória)
Novo `src/lib/documents/documentStore.ts` (Zustand, mesmo padrão de `opportunityStore` / `taskStore`):
- `Folder { id, name, parentId: string | null, policyId: string | null, clientName: string, createdAt }`
- `DocumentFile { id, name, folderId, policyId, clientName, mime, sizeKB, uploadedAt }`
- Ações: `createFolder`, `renameFolder`, `deleteFolder` (com cascata), `moveFolder`, `addFile` (apenas metadado mock), `renameFile`, `deleteFile`.
- Seed inicial: para cada apólice de `mock/data.ts`, criar pasta raiz "{número apólice}" com subpastas padrão "Proposta", "Boletos", "Endossos" e 2-3 arquivos fake.

### 2. Componente reutilizável de árvore
`src/components/documents/FolderTree.tsx` — componente puro recebe `rootFolderId` (ou `policyId` / `clientName` como filtro) e renderiza:
- Árvore expansível (pastas/subpastas) usando ícones `Folder`, `FolderOpen`, `FileText`.
- Toolbar contextual: **Nova pasta**, **Renomear**, **Excluir**, **Upload** (mock — abre dialog que só registra o nome).
- Confirmação via `AlertDialog` para exclusão (avisa se a pasta tem conteúdo).
- Renomear inline com `Input` + Enter/Esc.

### 3. Integração no drawer da Apólice
`PoliciesTab.tsx`:
- Aumentar `SheetContent` para `sm:max-w-2xl`.
- Envolver o conteúdo do Sheet em `Tabs` com **Detalhes** (conteúdo atual) e **Documentos** (`<FolderTree policyId={selected.id} />`).
- Mostrar contador "(N)" no label da aba Documentos.

### 4. Nova aba no módulo Carteira
`PortfolioModule.tsx`:
- Adicionar terceira `TabsTrigger` "Documentos" com contador.
- Novo `src/components/portfolio/DocumentsTab.tsx`: layout de 2 colunas (md+) — esquerda: busca + árvore global agrupada por cliente → apólice; direita: painel do item selecionado (lista de arquivos da pasta, ações). Em mobile, vira navegação stack (lista → detalhe).
- Suporta deep-link via state: `?client=...&policy=...` opcional (sem mexer em rotas — apenas estado interno passado pelo drawer do cliente).

### 5. Toque mínimo no drawer do Cliente
`ClientDetailDrawer.tsx`:
- Acrescentar **apenas** uma `Section` "Documentos" com: contador total de arquivos do cliente + botão "Ver na aba Documentos" que fecha o sheet, troca para a aba Documentos do `PortfolioModule` e pré-filtra pelo cliente. Sem árvore embutida.
- Para isso, `PortfolioModule` aceita `initialTab` + `initialClientFilter` via callback (lift state).

### Detalhes técnicos
- **Sem backend:** tudo via Zustand + persist em `localStorage` (uploads são metadados; sem arquivo binário real). Quando Lovable Cloud for habilitado, migra para Storage + tabela `documents` com RLS por usuário.
- **Tipos:** estender `mock/data.ts` apenas com re-export do tipo `Policy.id` (já existe).
- **Acessibilidade:** árvore com `role="tree"` / `treeitem`, navegação por teclado (↑↓ navega, → expande, ← colapsa, F2 renomeia, Delete exclui).

### Fora de escopo (fases futuras)
- Upload real de binários (depende de Cloud + Storage).
- Versionamento de arquivos.
- Permissões por pasta / compartilhamento externo com cliente.
- OCR / pré-visualização inline de PDFs.

### Arquivos
**Novos:** `src/lib/documents/documentStore.ts`, `src/components/documents/FolderTree.tsx`, `src/components/documents/FileList.tsx`, `src/components/portfolio/DocumentsTab.tsx`.
**Editados:** `src/components/modules/PortfolioModule.tsx`, `src/components/portfolio/PoliciesTab.tsx`, `src/components/portfolio/ClientDetailDrawer.tsx`.
