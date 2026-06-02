# Valor estimado opcional + Modal de fechamento

## Objetivo
Tornar `Valor estimado` opcional ao criar oportunidade e, ao mover o card para a coluna **Fechado**, abrir um modal que pergunta qual cotação foi fechada (ou aceita valor manual) — sobrescrevendo o `estimatedValue` com o valor real.

## Mudanças

### 1. `NewOpportunityDialog.tsx` — tornar valor opcional
- Remover asterisco do label "Valor estimado".
- Remover regra `valueNum <= 0` de `errors`.
- Permitir submit com valor vazio/zero (passa `0` ao store).
- Placeholder muda para "Opcional" para deixar claro.

### 2. Card e listagens — exibir "—" quando valor for 0
- Em `KanbanModule` / cards de oportunidade, quando `estimatedValue === 0`, mostrar `—` no lugar de `R$ 0`. (Localizar e ajustar onde `formatBRL(estimatedValue)` é renderizado em cards do pipeline.)

### 3. Novo componente `CloseOpportunityDialog.tsx`
Modal disparado quando o usuário move um card para a coluna **Fechado** (drag-and-drop ou ação de menu).

Conteúdo do modal:
- Título: "Fechar oportunidade — {clientName}"
- **Se houver cotações vinculadas** (busca via `quoteGroupId` no `quoteStore`):
  - Lista as cotações da seguradora com prêmio (radio list).
  - Usuário escolhe uma → valor da cotação preenche automaticamente um campo "Valor fechado" (editável caso precise ajustar).
- **Se não houver cotações**:
  - Apenas campo numérico "Valor fechado *" obrigatório.
- Botões: Cancelar / Confirmar fechamento.

Ao confirmar:
- Chama `setEstimatedValue(id, valorFinal)` (sobrescreve).
- Chama `moveStage(id, "fechado")`.
- Toast de sucesso.

Se cancelar: card volta para a coluna anterior (não move).

### 4. Integração no `KanbanModule`
- Interceptar a transição para `"fechado"` antes de chamar `moveStage` diretamente.
- Em vez disso, abrir o `CloseOpportunityDialog` com a oportunidade selecionada.
- Só após confirmação o `moveStage` é executado.
- Outras transições (lead → cotação, etc.) continuam sem modal.

## Fora do escopo
- Não adicionar campo separado `closedValue` (decisão: sobrescrever `estimatedValue`).
- Não alterar fluxo de "Perdido" (já tem seu próprio modal).
- Não criar relatório de previsto vs realizado.

## Arquivos afetados
- `src/components/pipeline/NewOpportunityDialog.tsx` (editar)
- `src/components/pipeline/CloseOpportunityDialog.tsx` (novo)
- `src/components/modules/KanbanModule.tsx` (interceptar transição para "fechado")
- Cards do pipeline onde `estimatedValue` é exibido (formatação "—" para 0)
