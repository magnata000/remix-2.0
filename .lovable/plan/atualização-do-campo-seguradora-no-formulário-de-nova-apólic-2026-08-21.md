# Atualização do campo Seguradora no formulário de Nova Apólice

## Objetivo
Atualizar o campo **Seguradora** no formulário de Nova Apólice para usar a lista de seguradoras reais, com filtro por ramo e ordenação alfabética.

## Escopo
1. **Formulário de Nova Apólice** (`src/components/portfolio/NewPolicyDialog.tsx`) — alteração principal.
2. **Formulário de Edição** (`src/components/portfolio/EditPolicyDialog.tsx`) e **Renovação** (`src/components/portfolio/RenewPolicyDialog.tsx`) — ajustar com a mesma lógica para manter consistência entre os formulários de apólice.

## Mudanças técnicas
- Substituir a lista hardcoded `INSURERS` em cada formulário para:
  - **Remover:** Allianz, Mapfre (dados mock).
  - **Adicionar:** Azul, Itaú, Tokio, Suhai.
  - **Ordenar:** alfabeticamente (Porto Seguro, Bradesco, SulAmérica, Azul, Itaú, Tokio, Suhai, etc.).
- Quando o ramo selecionado for **Saúde**, filtrar as opções para:
  - Porto Seguro, Bradesco, SulAmérica, São Cristóvão, Amil, Prevent Sênior, Med Sênior.
  - Ordenadas alfabeticamente.
- Quando o usuário trocar de ramo e a seguradora atual não for válida para o novo ramo, resetar automaticamente para a primeira opção válida da nova lista (evita valor inconsistente no campo).
- Garantir que os tipos `Insurer` existentes em `src/lib/mock/data.ts` já cobrem os novos valores (a verificação mostra que sim, exceto Tokio que está como "Tokio Marine" — ajustar label exibida se necessário).

## Fora de escopo desta tarefa
- Outras listas hardcoded de seguradoras em `ReconcileSheet.tsx`, `CommissionConfigSection.tsx`, `SettingsModule.tsx` e `policyExtraction.functions.ts` serão deixadas para uma limpeza posterior, salvo se solicitado.

## Validação
- Abrir o formulário de Nova Apólice e confirmar que Allianz/Mapfre não aparecem.
- Selecionar ramo Saúde e confirmar que apenas as seguradoras de saúde listadas aparecem.
- Verificar que a lista está em ordem alfabética.
- Testar troca de ramo e confirmar que a seguradora selecionada é corrigida quando inválida.
