## Objetivo
No `MentionInput` (timeline de tarefas), exibir o popover de menções **acima** da caixa de texto ao digitar `@`, com efeito flutuante (fade + slide-up + sombra elevada).

## Alterações em `src/components/tasks/MentionInput.tsx`

1. **Posicionamento acima**: trocar `mt-1` por `bottom-full mb-2 left-0` no container do popover, para ancorar acima do textarea.

2. **Efeito flutuante**:
   - Adicionar `animate-in fade-in slide-in-from-bottom-2 duration-200` (Tailwind animate plugin já presente via shadcn).
   - Reforçar elevação: `shadow-xl ring-1 ring-border/50 backdrop-blur-sm bg-popover/95`.
   - Itens com transição suave (`transition-colors`) e leve scale no hover (`hover:bg-muted/80`).

3. **Estado vazio**: quando `filtered.length === 0` mas o usuário digitou `@`, mostrar um pequeno card "Nenhum colaborador encontrado" (mesmo estilo flutuante) — opcional, mantém UX clara.

4. **Sem mudanças** no comportamento de teclado, lógica de detecção `@`, store ou outros componentes.
