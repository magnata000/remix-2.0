
# Plano: Modal "Marcar como perdida/o" unificado + correção de rótulos

## 1. Tipos e stores

**`src/lib/mock/data.ts`**
- Adicionar `lostNote?: string` em `Task`.
- Exportar mapa `lostReasonLabel: Record<LostReason, string>` = { preco: "Preço", cobertura: "Cobertura", prazo: "Prazo", "sem-retorno": "Sem retorno", outro: "Outro" }.

**`src/lib/pipeline/opportunityStore.ts`**
- Assinatura: `moveStage(id, stage, lostReason?, lostNote?)`. Persistir `lostNote` apenas quando `stage === "perdido"`; limpar quando muda de stage.

**`src/lib/multicalc/quoteStore.ts`**
- Adicionar `lostNote?: string` em `QuoteRecord`.
- Assinatura: `setStatus(groupId, status, lostReason?, lostNote?)`. Limpar quando status ≠ "perdida".

## 2. Componente reutilizável

**`src/components/shared/LostReasonDialog.tsx`** (novo)
- Props: `open`, `onOpenChange`, `title?` ("Marcar como perdida" ou "Mover para Perdido"), `onConfirm(reason, note)`.
- Conteúdo: `Select` com as 5 opções já existentes (rótulos com acento) + `Textarea` (label "Descrição (opcional)", maxLength 500, placeholder "Detalhe o motivo...").
- Botões "Cancelar" / "Confirmar". Reset ao abrir.

## 3. Kanban — interceptar entrada em "Perdido"

**`src/components/modules/KanbanModule.tsx`**
- Novo estado `pendingLost: { id: string } | null`.
- Helper `requestMove(id, stage)`: se `stage === "perdido"` → setPendingLost; senão → `moveStage(id, stage)`.
- Substituir todos os call sites por `requestMove`:
  - Desktop drop handler (linha 84-89).
  - Mobile dropdown "Mover para" no `KanbanCardBody` (passa `requestMove` como `onMove`).
- Renderizar `<LostReasonDialog open={!!pendingLost} onConfirm={(r,n) => { moveStage(pendingLost.id, "perdido", r, n); setPendingLost(null); }} />`.
- Corrigir exibição no card (linha 241-243): usar `lostReasonLabel[task.lostReason]` e, se `task.lostNote`, mostrar em linha separada truncada com `title` mostrando o texto completo.

## 4. Multicálculo — usar o componente compartilhado

**`src/components/multicalc/QuoteHistory.tsx`**
- Remover Dialog inline (linhas 322-343) e o state `lostReason`.
- Usar `<LostReasonDialog>`; `confirmLost` agora recebe `(reason, note)` e chama `setStatus(groupId, "perdida", reason, note)`.

## 5. Correções gramaticais

- O card mostrava "Motivo: preco" — resolvido pelo passo 3 (mapa de labels). Mesmo tratamento onde quer que `lostReason` apareça como texto cru. Verificar `ClientDetailDrawer` se exibe `stage` cru também — fora deste escopo a menos que use `lostReason`.

## Fora de escopo
- Persistência real (Lovable Cloud).
- Editar/limpar motivo após salvo (basta mover o card para outra etapa).
- Histórico de mudanças de stage.
