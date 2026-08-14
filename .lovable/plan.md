# Habilitar Documentos (Apólices e Clientes)

## Diagnóstico

A aba Documentos existe nos dois drawers (Cliente e Apólice) e a árvore de pastas está completa (criar/renomear/mover/excluir pasta, upload, renomear/excluir arquivo, busca por cliente). O que falta é a fonte de dados: o store de documentos ainda funciona só em memória e é semeado a partir dos dados fictícios de apólices, que foram removidos. Sem seed, ele fica vazio e os drawers mostram "Nenhuma pasta disponível" — daí a sensação de feature desabilitada.

Confirmado: as tabelas `doc_folders` e `doc_files` existem no banco, mas estão vazias (0 registros), e não há espaço de armazenamento de arquivos para documentos de clientes.

## O que será feito

1. **Persistir documentos no banco**, no mesmo padrão já usado nas Tarefas: pastas e arquivos passam a ser gravados e lidos do banco, ligados ao cliente e (quando for o caso) à apólice.
2. **Armazenamento real de arquivos**: criar o espaço `client-documents` (privado) e trocar o upload simulado por upload de arquivo real, com download por link temporário assinado.
3. **Criação automática das pastas seguindo as regras já estabelecidas**:
   - Raiz por cliente: "Geral do Cliente" (fixa, não renomeável/excluível).
   - Raiz por apólice: `Produto · Apólice <número> — <ramo>`.
   - Saúde: Documentação Preliminar (Empresa, Titular, Beneficiários, Cartas de Permanência e Carteirinhas, Documentação Complementar, Informações Pessoais) e Pós-venda (Acesso, Cotações, Proposta Contratada, Demonstrativos, Outros).
   - Seguros: pasta do ano de vigência com Boletos, Cotações, Endossos, Proposta Contratada.
   - Consórcio: Geral.
   - Novas apólices e renovações continuam gerando a estrutura automaticamente na criação.
4. **Backfill**: gerar as pastas para todos os clientes e apólices que já existem hoje na Carteira, respeitando o ramo e o ano de vigência de cada apólice. Nenhum arquivo é criado — só a estrutura de pastas.
5. **Contadores e busca** (número de documentos por cliente/apólice e busca de arquivos no drawer do cliente) passam a refletir os dados reais.

## Regras de acesso

Cada usuário vê os documentos dos clientes/apólices que já pode ver na Carteira (admin e pós-venda veem tudo; vendedor vê os seus). O mesmo critério vale para o armazenamento dos arquivos.

## Detalhes técnicos

- Novo `src/lib/documents/documents.functions.ts` (+ mapper) com server functions autenticadas: `listDocuments`, `createFolder`, `renameFolder`, `deleteFolder` (cascata), `moveFolder`, `uploadFile`, `renameFile`, `deleteFile`, `moveFile`, `ensurePolicyFolders`, `ensureClientRoot`.
- `documentStore.tsx` reescrito sobre TanStack Query (mesma API pública consumida por `FolderTree`, `PolicyDetailDrawer`, `ClientDetailDrawer`, `NewPolicyDialog`, `RenewPolicyDialog`), removendo o seed e o import de `@/lib/mock/data`.
- Chaves passam de `clientName` para `client_id`; nomes de cliente vêm da Carteira para exibição.
- Migração: criar bucket `client-documents` + políticas de storage; revisar/ajustar as políticas RLS de `doc_folders`/`doc_files` para o modelo de papéis atual (`can_view_all` / `assignee_id`); backfill de pastas em SQL a partir de `clients` e `policies`.
- `FolderTree`: input de arquivo real (`<input type="file">`), estado de envio e download via URL assinada.
