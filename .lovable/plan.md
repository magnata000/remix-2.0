
# Comissionamento por produto

Substituir o cálculo atual (`premium × commissionPct` → 1 comissão única) por um motor que gera um **cronograma de parcelas de comissão**, com regras específicas por produto e configuráveis por seguradora.

## Modelos suportados

### Saúde — Agenciamento + Recorrência
- **Agenciamento:** N parcelas iniciais com % decrescentes sobre a mensalidade do plano. Padrão sugerido: `[100%, 50%, 30%, 20%]` (4 parcelas, configurável).
- **Recorrência:** a partir do mês seguinte ao fim do agenciamento, % fixo (padrão 3%) sobre a mensalidade, **gerado mês a mês** (não projetado ao infinito).
- Todas as parcelas do agenciamento são geradas como `pendente` no momento do cadastro da apólice.

### Auto — Esgotamento ou Por parcela
Escolha por apólice no cadastro:
- **Esgotamento:** 1 única comissão = `prêmio × %comissão`, vencimento ~30 dias após emissão. Gerada como `pendente`.
- **Por parcela:** N parcelas (= parcelamento do cliente, ex: 10x). Cada uma = `(prêmio × %comissão) / N`, vencimentos mensais. Todas geradas como `pendente` no cadastro.
- `%comissão` definido pelo corretor dentro da faixa min/max da seguradora.

### Consórcio
- Mantém o modelo atual simples (1 comissão única) até haver definição. Sinalizado no UI como "modelo provisório".

## Imposto

Flag por seguradora: `comissaoLiquida: boolean`. Quando `true`, o valor exibido/registrado já desconta um % de imposto configurável (padrão 11,5% — INSS+ISS+IR aproximado). Quando `false`, valor bruto. Apenas afeta o `amount` final de cada parcela gerada.

## Configuração (seguradora + override por apólice)

Nova entidade `CommissionConfig`:

```text
{
  insurer: string
  product: "saude" | "auto" | "consorcio"
  comissaoLiquida: boolean
  taxaImposto?: number          // ex: 0.115
  // Saúde
  agenciamento?: number[]       // ex: [1.0, 0.5, 0.3, 0.2]
  recorrenciaPct?: number       // ex: 0.03
  // Auto
  pctMin?: number               // ex: 0.10
  pctMax?: number               // ex: 0.25
}
```

- Store em memória `commissionConfigStore` com seed para 3–4 seguradoras × 2 produtos.
- Tela mínima de leitura/edição em **Configurações** (uma sub-aba "Comissionamento") — CRUD simples em tabela.
- No diálogo de Nova Apólice: campos do modelo aparecem conforme o produto; vêm pré-preenchidos com o padrão da seguradora; corretor pode sobrescrever para aquela apólice.

## Motor de geração

`generateCommissionSchedule(policy, config) → Commission[]` puro, chamado:
- Ao criar apólice (`addPolicy`)
- Ao renovar (`renewPolicy`)
- Diariamente/no mount (apenas para Saúde): garantir que o mês corrente da recorrência tenha sua parcela gerada se ainda não existir.

Cada `Commission` ganha campos novos: `kind: "agenciamento" | "recorrencia" | "esgotamento" | "parcela" | "unica"`, `installmentIndex?: number`, `installmentTotal?: number`, `policyId: string`.

## UI

- **Caixa > Movimentações:** cada parcela vira uma linha. Coluna "Descrição" mostra ex: `Comissão — Apólice APO-2026-0123 (Agenciamento 2/4)` ou `(Parcela 3/10)` ou `(Recorrência)`.
- Filtro de status existente passa a operar sobre todas as parcelas.
- **Detalhes da movimentação:** mostra o cronograma completo daquela apólice (todas as parcelas, pagas e pendentes) com totais.
- **Nova Apólice / Editar Apólice:** seção "Comissionamento" dinâmica por produto.

## Seed novo

Substituir `commissions` seed por apólices realistas:
- 1 Saúde com agenciamento em andamento (parcela 2/4 paga, 3/4 pendente, 4/4 pendente) + 2 recorrências passadas pagas + 1 do mês atual pendente.
- 1 Auto esgotamento (já paga).
- 1 Auto parcelado 10x (3 pagas, 1 atrasada, 6 pendentes).
- 1 Consórcio (modelo simples atual).
- Total: ~15–20 linhas no Caixa, distribuídas em meses diferentes.

## Arquivos afetados

- `src/lib/financial/commissionStore.tsx` — refatorar `addCommissionFromPolicy` → `addCommissionsFromPolicy` (retorna array); usar o motor.
- `src/lib/financial/commissionEngine.ts` (novo) — função pura de geração.
- `src/lib/financial/commissionConfigStore.tsx` (novo) — config por seguradora.
- `src/lib/mock/data.ts` — novos campos em `Commission` e `Policy`; novo seed.
- `src/components/portfolio/NewPolicyDialog.tsx` e `EditPolicyDialog.tsx` — seção comissionamento dinâmica.
- `src/components/financial/CaixaTab.tsx` — descrição enriquecida da linha.
- `src/components/financial/MovementDetailsSheet.tsx` — mostrar cronograma da apólice.
- `src/components/modules/SettingsModule.tsx` — nova sub-aba "Comissionamento".
- `src/components/financial/ReportTab.tsx` — ajustar agregações (já trabalha com `commissions`, deve continuar funcionando).

## Fora de escopo

- Modelo definitivo de Consórcio (aguardando informações).
- Comissão escalonada por meta/produção.
- Repasse de comissão para sub-corretor / time.
- Conciliação automática contra extrato da seguradora.
- Persistência em backend (continua tudo em memória).
