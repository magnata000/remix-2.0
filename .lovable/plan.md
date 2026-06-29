# Plano — Campos exclusivos por Tipo em Comissionamento (Saúde)

## Objetivo
Na sub-aba **Configurações › Comissionamento**, no card de Saúde, exibir apenas os campos pertinentes ao **Tipo** selecionado:

- **Tipo = Agenciamento** → mostra bloco "Agenciamento (% por parcela)" · oculta "A partir da parcela (Vitalício)"
- **Tipo = Vitalício** → mostra "A partir da parcela (Vitalício)" · oculta bloco "Agenciamento (% por parcela)"

Campos comuns continuam visíveis em ambos: **Paga comissão líquida**, **% recorrência mensal**, **Malha**.

## Comportamento
- Valores digitados no campo oculto são **preservados** em memória local do componente, reaparecendo se o usuário voltar ao Tipo anterior.
- O `Salvar` continua persistindo todos os campos no `CommissionConfig` (não removemos dados ao alternar) — assim a engine mantém compatibilidade caso outra apólice use scheme diferente.

## Alterações técnicas
Arquivo único: `src/components/settings/CommissionConfigSection.tsx`
- No card de Saúde, ler `defaultScheme` (Agenciamento/Vitalício) e renderizar condicionalmente:
  - bloco do array `agenciamento` apenas se `defaultScheme === "agenciamento"`
  - input `vitalicioStartInstallment` apenas se `defaultScheme === "vitalicio"`
- Manter o `<Select>` de Tipo, `% recorrência mensal` e `Malha` sempre visíveis.

Sem alterações em `commissionEngine.ts`, `commissionConfigStore.tsx` ou dialogs de apólice — a regra é puramente de UI.
