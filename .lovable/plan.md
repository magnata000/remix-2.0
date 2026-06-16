## Objetivo
Liberar o acesso normal às páginas **Financeiro** e **Configurações**, removendo o overlay "Em breve" que hoje bloqueia a interação com o conteúdo.

## Alterações

**`src/components/modules/FinancialModule.tsx`**
- Remover o `import { ComingSoonOverlay }`.
- Remover o wrapper `<ComingSoonOverlay>…</ComingSoonOverlay>` (linhas 80 e 207), mantendo o conteúdo interno intacto.

**`src/components/modules/SettingsModule.tsx`**
- Remover o `import { ComingSoonOverlay }`.
- Remover o wrapper `<ComingSoonOverlay>…</ComingSoonOverlay>` (linhas 23 e 146), mantendo o conteúdo interno intacto.

## Fora de escopo
- Não excluir o arquivo `src/components/shared/ComingSoonOverlay.tsx` (pode ser reutilizado em outros módulos no futuro).
- Nenhuma mudança no conteúdo/funcionalidades existentes das duas páginas.
