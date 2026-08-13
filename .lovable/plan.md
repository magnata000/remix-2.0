# Ajustes de layout na Daily

## Objetivo
1. Fazer a box **"Apólices vencendo em 30 dias"** ocupar duas colunas (mesma largura da box de troca de faixa etária).
2. Ajustar a box **"Troca de faixa etária (Saúde)"** para exibir todas as informações sem scroll horizontal, mantendo responsividade.

## Escopo de mudanças
Alterar apenas `src/components/modules/DailyModule.tsx`.

## Mudanças técnicas

### 1. Grid da Daily
Atualmente a `RenewalsSection` (Apólices vencendo em 30 dias) vive dentro de um grid de 2 colunas (`grid grid-cols-1 lg:grid-cols-2`), enquanto a `AgeBandSection` está fora desse grid e ocupa a largura total.

- Mover a `RenewalsSection` para fora do grid, posicionando-a logo antes da `AgeBandSection`, de forma que ambas ocupem 100% da largura disponível.
- Alternativa viável: adicionar `lg:col-span-2` na `RenewalsSection`. Optaremos por essa segunda opção, pois mantém a estrutura semântica (grupo de cards no topo e as duas seções largas embaixo) com menos refactor.

### 2. Responsividade da Troca de faixa etária
A `AgeBandSection` usa uma `<table>` com `overflow-x-auto`, o que força scroll horizontal em telas menores.

- Remover o `overflow-x-auto` e o `<table>`.
- Substituir por um layout responsivo em grid:
  - **Mobile**: cada item ocupa uma linha/cartão com as informações empilhadas (nome, vínculo, faixa de/para e data). Nenhum dado fica escondido.
  - **Desktop (md+)**: cada item vira uma linha de 4 colunas (Nome | Vínculo | Faixa | Data), mantendo o cabeçalho tabular.
- Usar `grid` + `min-w-0` + `truncate` para evitar estouro de texto, conforme padrão de layout responsivo do projeto.
- Garantir que o `max-h-80 overflow-y-auto` do `SectionCard` continue funcionando (scroll vertical permanece, se necessário, mas nunca horizontal).

## Resultado esperado
- "Apólices vencendo em 30 dias" passa a ter a mesma largura de "Troca de faixa etária".
- "Troca de faixa etária" mostra todos os dados em qualquer largura, sem swipe horizontal, e sem perder a legibilidade no desktop.
