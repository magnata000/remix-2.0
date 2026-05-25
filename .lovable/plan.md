
# Reorganização do módulo Documentos

## Objetivo
Eliminar a aba global "Documentos" do `PortfolioModule`. Centralizar a gestão consolidada no Drawer do Cliente; manter o Drawer da Apólice focado apenas na pasta daquela apólice.

## Nova arquitetura de dados

Hierarquia de pastas raiz por cliente:
```
Cliente João
├── Geral do Cliente        (parentId=null, policyId=null, clientName=João)
├── Apólice AUTO-1234       (parentId=null, policyId=AUTO-1234, clientName=João)
│   └── (subpastas livres do usuário)
└── Apólice VIDA-9876       (parentId=null, policyId=VIDA-9876, clientName=João)
```

- Pasta **"Geral do Cliente"** criada automaticamente no seed para todo cliente, marcada como `isClientRoot: true` (não pode ser excluída nem renomeada).
- Pastas de apólice continuam como raízes (`parentId: null`), uma por apólice, também não-removíveis no nível raiz.
- Subpastas livres dentro de cada raiz continuam totalmente editáveis.

## Mudanças por arquivo

### `src/lib/documents/documentStore.tsx`
- Adicionar campo `isClientRoot?: boolean` em `DocFolder`.
- Atualizar seed: para cada cliente único derivado de `policies`, criar 1 pasta "Geral do Cliente" + 1 pasta por apólice (nome: `Apólice {numero} — {ramo}`), todas como raiz (`parentId: null`).
- Bloquear `renameFolder`/`deleteFolder` quando a pasta é raiz de apólice ou `isClientRoot`.
- Novo helper: `rootFoldersByClient(clientName)` → retorna `[geralDoCliente, ...pastasDeApolice]` ordenadas (Geral primeiro).
- Novo helper: `searchFilesByClient(clientName, query)` → busca por nome de arquivo em todas as pastas (recursivo) daquele cliente.

### `src/components/portfolio/ClientDetailDrawer.tsx`
- Trocar layout interno por `Tabs`: **Visão geral** | **Documentos**.
- **Visão geral**: conteúdo atual (KPIs, apólices, pipeline, timeline, ações). Remover a seção compacta "Documentos" + botão "Ver na aba Documentos".
- **Documentos**: render `<FolderTree rootFolders={rootFoldersByClient(clientName)} />` + campo de busca no topo (filtra arquivos via `searchFilesByClient`; quando há query, mostra lista plana de resultados com breadcrumb da pasta de origem em vez da árvore).
- Aumentar largura do Sheet para `sm:max-w-2xl` para acomodar a árvore + painel de arquivos.
- Remover prop `onJumpToDocuments` (sem uso após mudança).

### `src/components/modules/PortfolioModule.tsx`
- Remover `TabsTrigger` "Documentos" e `TabsContent` correspondente.
- Remover state `documentsFilter` e handler `jumpToDocuments`.
- Remover import de `DocumentsTab` e `useDocumentStore`.
- TabsList passa a ter 2 abas: **Apólices** | **Clientes**.

### `src/components/portfolio/PoliciesTab.tsx`
- Drawer da apólice continua com abas internas (Detalhes | Documentos), sem alteração estrutural.
- Ajuste fino: `<FolderTree rootFolders={[pastaDaApolice]} showRootNames={false} />` (já comporta — só garantir que o seed gera 1 raiz por apólice).

### `src/components/portfolio/DocumentsTab.tsx`
- **Deletar arquivo.**

### `src/components/documents/FolderTree.tsx`
- Esconder botões "Renomear" e "Excluir" quando `selected.isClientRoot === true` ou quando `selected.parentId === null && selected.policyId` (raiz de apólice). A lógica atual já oculta para `parentId === null`, basta manter coerente.
- Sem mudanças na assinatura pública.

### Busca dentro da aba Documentos do cliente
Componente novo enxuto `<ClientDocsSearch />` (inline no drawer ou em `src/components/documents/ClientDocsSearch.tsx`):
- Input de busca controlado.
- Quando vazio → renderiza `FolderTree`.
- Quando preenchido → lista resultados (ícone, nome, pasta de origem com label da apólice, data, tamanho) clicáveis que selecionam a pasta correspondente na árvore e limpam a busca.

## Fora de escopo
- Upload real, drag-and-drop, versionamento, permissões.
- Migração para Lovable Cloud (mantém Zustand + localStorage por enquanto).
- Mover/copiar arquivos entre pastas de apólices diferentes.

## Riscos / notas
- Usuários com localStorage populado pela versão anterior verão pastas seed antigas até o store fazer reset. Vou bumpar a versão do storage key (ex.: `lov-docs-v2`) para forçar re-seed limpo com a nova estrutura (Geral do Cliente + raízes de apólice).
- Drawer do cliente fica mais largo (`max-w-2xl`); em telas < 640px o Sheet continua full-width, sem regressão mobile.
