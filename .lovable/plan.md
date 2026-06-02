# Excluir cotações e versões no Multicálculo

## Objetivo
Permitir excluir uma **versão** individual ou um **grupo de cotações inteiro** na página Multicálculo, com UI discreta (ícones ghost) e confirmação obrigatória.

## Mudanças

### 1. `src/lib/multicalc/quoteStore.ts` — novos métodos no store
- `deleteVersion(versionId: string)`: remove o `QuoteRecord` do array. Se era a última versão do grupo, o grupo deixa de existir automaticamente (pois `groups` é derivado).
- `deleteGroup(groupId: string)`: remove todos os `QuoteRecord` do grupo.
- Expor ambos no `Ctx` e no `value` do provider.

### 2. `src/lib/pipeline/opportunityStore.ts` — limpar vínculo órfão
- Novo método `unlinkQuoteGroup(groupId: string)`: percorre `opportunities` e zera `quoteGroupId` em qualquer card vinculado. Chamado pelo Multicálculo após excluir um grupo, para não deixar o card do pipeline apontando para uma cotação inexistente.

### 3. `src/components/multicalc/QuoteHistory.tsx` — UI discreta

**Excluir versão** (linha de cada `v.version`):
- Adicionar `Button` `size="icon" variant="ghost"` com ícone `Trash2` (lucide), classe `h-7 w-7 text-muted-foreground hover:text-destructive`, junto dos demais botões da linha (ao lado do "Editar (nova versão)").
- `title="Excluir esta versão"`.
- Ao clicar, abre `AlertDialog` de confirmação:
  - Título: "Excluir versão v{n}?"
  - Descrição: "Esta ação não pode ser desfeita. A versão será removida do histórico."
  - Confirmar → `deleteVersion(v.id)` + toast "Versão excluída". Se a versão estava em `selected`, remover via `onToggleSelect`.

**Excluir grupo inteiro** (header do `Collapsible`):
- Adicionar ícone `Trash2` discreto no canto direito do header (junto aos botões "Ganha"/"Perdida"), `size="icon" variant="ghost"` com `text-muted-foreground hover:text-destructive`.
- `title="Excluir cotação completa"`.
- Ao clicar, abre `AlertDialog`:
  - Título: "Excluir cotação de {clientName}?"
  - Descrição: "Todas as {n} versões serão removidas permanentemente.{linkedOpp ? " O card vinculado no Pipeline será desvinculado." : ""}"
  - Confirmar → `deleteGroup(g.groupId)` + se `linkedOpp` existe, `unlinkQuoteGroup(g.groupId)` + toast "Cotação excluída".

### 4. Estados locais no `QuoteHistory`
- `const [versionToDelete, setVersionToDelete] = useState<QuoteRecord | null>(null)`
- `const [groupToDelete, setGroupToDelete] = useState<{ groupId, clientName, versionsCount, hasLinkedOpp } | null>(null)`

Usar `<AlertDialog>` (já existe em `src/components/ui/alert-dialog.tsx`).

## Fora do escopo
- Não há "lixeira"/undo — exclusão é definitiva (mock data; toast simples).
- Não alterar layout dos filtros nem dos botões principais.

## Arquivos afetados
- `src/lib/multicalc/quoteStore.ts` (adicionar `deleteVersion`, `deleteGroup`)
- `src/lib/pipeline/opportunityStore.ts` (adicionar `unlinkQuoteGroup`)
- `src/components/multicalc/QuoteHistory.tsx` (botões + AlertDialogs)
