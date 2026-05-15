## Objetivo

Adicionar um botão **Recalcular** ao lado do botão **Editar (nova versão)** nos cards de versão de cotações classificadas como **Expirada**, permitindo refazer a cotação com os mesmos dados já preenchidos.

## Comportamento

- O botão **Recalcular** aparece apenas quando o status efetivo do grupo é `expirada`.
- Visível em todas as versões do grupo expirado (assim como o botão Editar já é).
- Ao clicar:
  1. Reaproveita o `formData` da versão (igual ao fluxo de "Editar nova versão").
  2. Abre o **MulticalcWizard** já preenchido na aba "Nova cotação".
  3. Pula direto para a etapa final (resultados), recalculando os preços com a data atual — gerando uma nova versão `vN+1` no mesmo grupo.
  4. Como a nova versão terá `createdAt = hoje`, o status efetivo do grupo volta automaticamente para **Em aberto** (regra dos 10 dias já existente).
- Diferença em relação a **Editar (nova versão)**: o Editar leva o usuário ao passo 1 do wizard para eventuais ajustes; o Recalcular vai direto ao recalculo sem revisar campos (atalho de "mesmos dados, novos preços").

## Mudanças técnicas

**`src/components/multicalc/QuoteHistory.tsx`**
- Adicionar prop opcional `onRecalculate?: (rec: QuoteRecord) => void`.
- No bloco de ações da versão (`<div className="flex gap-2 md:shrink-0 ...">`), renderizar um botão **Recalcular** (ícone `RefreshCw` do lucide-react) condicional a `eff === "expirada"` (ou ao status do grupo `g.status === "expirada"` — usar o status do grupo para mostrar em todas as versões).

**`src/components/modules/MulticalcModule.tsx`**
- Adicionar handler `handleRecalculate(rec)` que:
  - Chama `addVersion(rec.groupId, rec.formData, novosResultados, novoWinner)` diretamente, sem passar pelo wizard, OU
  - Define um estado `recalculating` e abre o wizard em modo "auto-submit" pulando para a tela final.
- Recomendação: implementar a opção mais simples — criar nova versão imediatamente via `addVersion`, recomputando preços com a função de cálculo já usada pelo wizard (extrair/reutilizar). Toast: `"Cotação recalculada — nova versão vN salva"`.
- Após salvar, mudar para a aba `historico` e focar o grupo (`setFocusedGroupId(rec.groupId)`).

**`src/lib/multicalc/quoteStore.ts`** (somente se a função de cálculo de preços viver hoje dentro do wizard)
- Extrair a lógica de `computeResults(formData)` para o store/util compartilhado, para que `handleRecalculate` possa chamá-la sem montar o wizard.

## Critérios de aceitação

- Em um grupo com status **Expirada** (ex.: "Beatriz Costa"), ao expandir, cada versão exibe **Editar (nova versão)** e **Recalcular** lado a lado.
- Em grupos **Em aberto / Ganha / Perdida**, o botão Recalcular **não** aparece.
- Clicar em Recalcular cria uma nova versão `vN+1` no mesmo grupo, com `createdAt` atual e novos `results`.
- O badge do grupo passa de **Expirada** para **Em aberto** automaticamente após o recálculo.
- Toast de sucesso é exibido e a aba muda para Histórico com o grupo expandido.
