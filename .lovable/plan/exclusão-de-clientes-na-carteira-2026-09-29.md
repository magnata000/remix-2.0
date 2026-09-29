# Exclusão de clientes na Carteira

## Objetivo
Permitir excluir um cliente cadastrado por engano, removendo também tudo o que depende dele (apólices, beneficiários, comissões, follow-ups, pastas e documentos), para evitar duplicidades e registros órfãos.

## O que será feito

### 1. Banco de dados (migração)
- Adicionar política RLS de `DELETE` em `clients` (admin/pós-venda excluem qualquer cliente; vendedor apenas os seus, seguindo o padrão das outras tabelas).
- Garantir `ON DELETE CASCADE` nas chaves estrangeiras que apontam para `clients` e `policies` (beneficiaries, commissions, follow_ups, doc_folders, doc_files). Onde a FK atual não tiver cascade, recriar a constraint na mesma migração.

### 2. Server function `deleteClient` (carteira.functions.ts)
- Nova função autenticada que, na ordem:
  1. Busca os `doc_files` do cliente e remove os arquivos do bucket `client-documents` (storage).
  2. Exclui o cliente — as demais tabelas caem em cascata.
- Retorna erro amigável se a exclusão falhar.

### 3. Store (clientStore.tsx)
- Adicionar `removeClient(id)` com mutation que chama `deleteClient` e invalida as queries de clientes, apólices, comissões e follow-ups.

### 4. Interface
- **Drawer do cliente** (`ClientDetailDrawer.tsx`): botão "Excluir cliente" (ícone de lixeira, vermelho) no cabeçalho, ao lado de Editar.
- **Confirmação**: `AlertDialog` informando que apólices, comissões, follow-ups e documentos do cliente também serão excluídos, com botão de confirmação destrutivo.
- Se o cliente tiver apólices, o aviso mostra a quantidade ("Este cliente possui X apólice(s) que também serão excluídas").
- Após excluir: fecha o drawer, mostra toast de sucesso e a lista atualiza.

## Fora de escopo
- Exclusão de apólices individuais pela UI (já existe `deletePolicy` no backend; não será exposta agora).
- Lixeira/restauração (exclusão é definitiva).

## Verificação
- Build OK, testes existentes passando.
- Teste no preview: criar cliente de teste com apólice e documento, excluir, confirmar no banco que não restam registros órfãos, e remover o teste.
