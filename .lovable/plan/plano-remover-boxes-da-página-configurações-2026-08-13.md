# Plano: Remover boxes da página Configurações

## Objetivo
Remover três boxes da página **Configurações**:
1. SLA — prazos padrão
2. Preferências
3. Plano & Faturamento

## Alterações

### `src/components/modules/SettingsModule.tsx`
- Remover a importação de `SlaConfigSection`.
- Remover os ícones `Bell` e `CreditCard` do import do `lucide-react` (caso fiquem sem uso).
- Remover a renderização `<SlaConfigSection />`.
- Remover a `<Section icon={Bell} title="Preferências" …>` completa.
- Remover a `<Section icon={CreditCard} title="Plano & Faturamento" …>` completa.
- Manter as demais seções: Perfil da corretora, Equipe, Integrações e Comissionamento.

## Notas
- Não excluir os arquivos fonte (`SlaConfigSection.tsx`, `slaConfigStore`, etc.) — apenas ocultar o bloco da página de Configurações.
- Ajuste de importações é necessário para evitar warnings de variáveis/imports não utilizados.
