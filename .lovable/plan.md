## Objetivo

Sinalizar que os módulos **Financeiro** e **Configurações** ainda estão em construção, adicionando um quadro com efeito glassmorphism e a frase "Em Breve" sobre o conteúdo atual de cada página.

## Mudanças

### 1. Novo componente `src/components/shared/ComingSoonOverlay.tsx`
Componente reutilizável que:
- Envolve o conteúdo do módulo (`children`) num container `relative`.
- Renderiza o conteúdo existente com `pointer-events-none` e leve `opacity` reduzida (preview borrado ao fundo).
- Sobrepõe uma camada absoluta centralizada com um card glassmorphism contendo:
  - Ícone (lucide `Construction` ou `Sparkles`).
  - Título "Em Breve".
  - Subtítulo curto: "Este módulo está em construção e estará disponível em breve."
- Estilo glass usando tokens existentes:
  - `bg-white/30 dark:bg-white/10`
  - `backdrop-blur-xl`
  - `border border-white/40`
  - `shadow-xl`, `rounded-2xl`
  - Sem `-webkit-backdrop-filter` manual (regra do Tailwind v4).

### 2. `src/components/modules/FinancialModule.tsx`
- Envolver o `return` (todo o conteúdo do módulo) com `<ComingSoonOverlay>`.

### 3. `src/components/modules/SettingsModule.tsx`
- Mesma alteração: envolver o conteúdo com `<ComingSoonOverlay>`.

## Validação

- Navegar para "Financeiro" e "Configurações" no preview: o conteúdo aparece desfocado/atenuado ao fundo, com o card glass "Em Breve" centralizado e legível.
- Dashboard, Carteira, Kanban e Multicálculo continuam funcionando normalmente.
