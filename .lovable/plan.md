## Objetivo
Tornar as opções flutuantes do `@` totalmente clicáveis e fazer o destaque (seletor) acompanhar a digitação, priorizando matches no início do nome. `Enter` continua selecionando a opção destacada.

## Causa raiz
1. O popover de menções é renderizado via `createPortal(..., document.body)` dentro de `MentionInput.tsx`. Quando aberto dentro do `Dialog` da tarefa, o Radix Dialog aplica `pointer-events: none` no body, então o popover aparece, mas não recebe cliques.
2. `hoverIndex` só é resetado quando o popover fecha; ao digitar e filtrar a lista, o destaque pode ficar fora da opção mais relevante.

## Mudanças (apenas `src/components/tasks/MentionInput.tsx`)

1. **Pointer events**
   - Adicionar `pointer-events: auto` (via `style` inline, junto com `position: fixed`) no container do popover portalado.
   - Adicionar a classe `pointer-events-auto` no `<button>` de cada opção, como reforço.

2. **Ordenação por relevância**
   - Manter `Todos` sempre no topo (quando ainda elegível).
   - Para os demais, ordenar por:
     1. nome que começa com `query` (case-insensitive) primeiro,
     2. depois nomes que apenas contêm `query`,
     3. desempate alfabético.
   - Continuar limitando a 6 itens e respeitando os filtros já existentes (esconder já mencionados, esconder todos quando `Todos` já foi mencionado).

3. **Destaque acompanha digitação**
   - Resetar `hoverIndex` para `0` sempre que `query` mudar ou a lista filtrada mudar de tamanho (já existe um effect parcial; ajustar para zerar em mudança de `query` mesmo com popover aberto).
   - Como a lista é reordenada por relevância, o índice 0 passa a ser a opção mais condizente com o que está sendo digitado.

4. **Enter**
   - Comportamento já implementado em `onKeyDown` (`Enter` sem shift insere `options[hoverIndex]`). Nenhuma mudança adicional necessária — passa a funcionar corretamente por consequência dos itens 2 e 3.

## Fora de escopo
- Não alterar `TaskDetailDialog.tsx`, store de tarefas, estilos globais, nem o comportamento de `Ctrl/Cmd+Enter` (quebra de linha) e `Enter` (envio) já existentes.
- Não mexer na renderização de menções (`renderMentions`).
