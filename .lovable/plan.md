## Correção: alíquotas configuráveis em "DRE & Impostos"

### Diagnóstico atual
O código já existe e está wired:
- `src/components/settings/DreConfigSection.tsx` renderiza dois `<Input type="number">` para `taxOnRevenuePct` e `taxOnProfitPct`.
- `SettingsModule.tsx` importa e renderiza `<DreConfigSection />`.
- `routes/index.tsx` envolve tudo em `DreConfigProvider`.

Ou seja, no código estático os campos estão presentes. O relato do usuário ("não há alíquotas configuráveis") indica um problema de runtime/visual, não ausência de código.

### Passo 1 — Reproduzir no navegador (Playwright em modo build)
Abrir `http://localhost:8080`, ir em Configurações, rolar até "DRE & Impostos", tirar screenshot da seção e capturar erros do console. Isso identifica qual das três hipóteses é a real:

1. **Erro de render** (ex.: `useDreConfig` falhando em algum ponto, boundary silenciosa) → a seção some inteira.
2. **Ordem/visibilidade** — a seção existe mas está abaixo de outras e o usuário não rolou até ela, ou o card está com altura zero por algum motivo de layout.
3. **Inputs presentes mas visualmente indistinguíveis** — `bg-muted border-0` sobre fundo branco pode estar apagando a borda dos campos numéricos.

### Passo 2 — Correção conforme diagnóstico

- **Se erro de render**: corrigir a causa (provavelmente algum consumidor de `useDreConfig` fora do provider, ou tipo incorreto).
- **Se ordem/visibilidade**: mover `<DreConfigSection />` para logo abaixo de "Comissionamento"/"SLA" (já está lá, mas reforçar posicionamento) e garantir que o Card tenha destaque visual — adicionar um Badge "Novo" temporário e âncora scroll.
- **Se estilo confuso**: adicionar `border border-border` explícito aos inputs numéricos, sufixo `%` visual, e um botão "Salvar alíquotas" com toast (hoje o `onChange` altera direto, sem confirmação — usuário pode não perceber que já está salvo).

### Passo 3 — Melhorias que serão feitas de qualquer forma
Independente da causa raiz, aplicar:
- Título da seção mais evidente ("Alíquotas de impostos") como subtítulo antes dos dois inputs.
- Sufixo `%` dentro do Input (usando wrapper com `<span>` absoluto), para deixar claro que é percentual.
- Feedback visual (toast "Alíquota atualizada") ao alterar cada campo (debounced 500ms) para que o usuário veja que a mudança persiste.
- Verificação pós-fix via novo screenshot Playwright confirmando que os dois campos estão visíveis, editáveis e com valores default 6 e 15.

### Arquivos afetados
- `src/components/settings/DreConfigSection.tsx` (ajustes visuais + feedback)
- Possivelmente `src/lib/financial/dreConfigStore.tsx` (se o diagnóstico apontar erro no provider)

Nenhum outro módulo, store ou cálculo será alterado.
