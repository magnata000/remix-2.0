# Restringir comparação ao mesmo ramo

Regra: só é possível comparar versões do mesmo ramo (Auto, Vida, Residencial, Empresarial, Saúde). Selecionar versões de ramos distintos não deve permitir abrir a tela de Comparar.

## Mudanças

**`src/components/multicalc/QuoteHistory.tsx`**
- Derivar `selectedBranches` a partir de `selected` cruzando com `records` do store (set de ramos únicos).
- Definir `mixedBranches = selectedBranches.size > 1`.
- Checkbox de cada versão: desabilitar quando já há seleção em outro ramo (`selectedBranches.size === 1 && !selectedBranches.has(v.branch) && !isSelected`). Tooltip/título: "Só é possível comparar cotações do mesmo ramo".
- Botão "Comparar": `disabled` se `selected.length < 2 || mixedBranches`.
- Quando `mixedBranches` for true (caso de borda), exibir aviso pequeno abaixo da barra de filtros: "Selecione versões do mesmo ramo para comparar." em `text-destructive`.

**`src/components/multicalc/QuoteCompare.tsx`**
- Após carregar `versions`, verificar `new Set(versions.map(v => v.branch)).size > 1`. Se misto, renderizar Card de bloqueio (mesmo padrão do "Selecione 2+") com mensagem: "Não é possível comparar cotações de ramos diferentes." e botão Voltar. Defesa em profundidade caso a restrição da UI seja contornada.

**`src/components/modules/MulticalcModule.tsx`** (verificar se há lógica de toggle compartilhada)
- Se a função `onToggleSelect` vive aqui, opcionalmente impedir adicionar id de outro ramo (toast informativo). Caso contrário, manter apenas o disable visual no checkbox.

## Critérios de aceitação
- Selecionar 2 versões do mesmo ramo: botão Comparar habilita normalmente.
- Após selecionar 1 versão (ex.: Auto), checkboxes de versões de outros ramos ficam desabilitados.
- Botão Comparar permanece desabilitado se houver mistura de ramos; mensagem inline explica o motivo.
- A tela `QuoteCompare` exibe bloqueio claro caso receba ids de ramos distintos.
