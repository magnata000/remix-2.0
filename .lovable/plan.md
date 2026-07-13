## Objetivo
Tratar apólices de Saúde como vitalícias na Carteira.

## Mudanças

**1. `src/components/portfolio/PoliciesTab.tsx` — coluna Vigência (tabela desktop)**
- Na célula de vigência (linha 222-224), quando `p.branch === "Saúde"`, exibir "Vitalício" (badge/texto sutil) em vez de `formatDateShort(p.endDate)`.

**2. `src/components/portfolio/PolicyDetailDrawer.tsx` — Drawer**
- Na seção "Vigência" (Row), quando `policy.branch === "Saúde"`, exibir "Vitalício" em vez de `startDate → endDate`.
- Ocultar completamente o botão "Renovar" (e o `TooltipProvider` que o envolve) quando `policy.branch === "Saúde"`. O botão "Imprimir" continua visível e ocupa a largura restante.
- Também não renderizar `<RenewPolicyDialog>` para Saúde (não é acionável).

## Fora de escopo
- Formulário "Nova Apólice" / "Editar Apólice": não alterar campos de data para Saúde neste passo (o modelo `Policy` mantém `endDate` opcional; a UI da Carteira apenas apresenta como vitalício quando ramo = Saúde).
- Cards mobile da aba Apólices não exibem vigência hoje, então não há mudança lá.
- Lógica de renovação/comissões: intacta.