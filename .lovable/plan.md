# Plano — Configurações > Comissionamento

## 1. Renomeação de labels

Trocas apenas de texto na UI (sem mudança nos valores internos / chaves), em `CommissionConfigSection.tsx` e nos pontos que exibem essas opções (`NewPolicyDialog.tsx`, `EditPolicyDialog.tsx`, `RenewPolicyDialog.tsx`, `MovementDetailsSheet.tsx`, `commissionEngine.commissionKindLabel`).

| Atual | Novo |
|---|---|
| Auto / Seguros | Seguros |
| Esgotamento (antecipada) | Adiantamento |
| Por parcela | Parcelado |
| Esquema padrão | Tipo |

Chaves internas (`"esgotamento"`, `"parcela"`, `"agenciamento"`, `"unica"`, `product: "auto"`) permanecem inalteradas para não quebrar dados mockados nem o motor de comissão.

## 2. Seguros — limites de parcela por seguradora

Estender `CommissionConfig` (em `commissionEngine.ts`) com dois novos campos opcionais, válidos só quando `product === "auto"`:

```ts
parceladoMinInstallments?: number;   // “A partir de X parcelas”  (Tipo = Parcelado)
adiantamentoMaxInstallments?: number; // “Até X parcelas”          (Tipo = Adiantamento)
```

Seed em `commissionConfigStore.tsx` (`baseAuto`): default `parceladoMinInstallments = 5`, `adiantamentoMaxInstallments = 4`.

UI (`CommissionConfigSection.ConfigCard`, bloco `isAuto`):
- Quando `defaultScheme === "parcela"` exibe input **“A partir de X parcelas”**.
- Quando `defaultScheme === "esgotamento"` exibe input **“Até X parcelas”**.
- Ambos inteiros ≥ 1. Validação no `save()`.

Validação no cadastro/edição de apólice (`NewPolicyDialog.tsx`, `EditPolicyDialog.tsx`, `RenewPolicyDialog.tsx`) quando ramo ≠ Saúde/Consórcio:
- Buscar `configForPolicy({ insurer, branch })`.
- Construir lista de opções do select **Tipo** dinamicamente:
  - **Parcelado** habilitado apenas se `commissionInstallments >= parceladoMinInstallments`.
  - **Adiantamento** habilitado apenas se `commissionInstallments <= adiantamentoMaxInstallments`.
- Opções desabilitadas aparecem com texto auxiliar (“min 5 parcelas”, “máx 4 parcelas”) e, se a seleção atual se tornar inválida, força fallback para a outra opção + toast.

## 3. Saúde — novo tipo Vitalício

Adicionar `"vitalicio"` a `CommissionScheme` em `commissionEngine.ts`. Atualizar `SCHEMES_BY_PRODUCT.saude` em `CommissionConfigSection.tsx`:
```
{ value: "agenciamento", label: "Agenciamento + recorrência" }
{ value: "vitalicio",    label: "Vitalício" }
```

Novo campo em `CommissionConfig` (saúde):
```ts
vitalicioStartInstallment?: number; // "A partir da parcela"
```
Exibido no `ConfigCard` quando `product === "saude"` e `defaultScheme === "vitalicio"` (default 13).

Motor de comissão (`commissionEngine.ts`):
- `generateCommissionSchedule` para Saúde + scheme `"vitalicio"`: gera as primeiras `vitalicioStartInstallment - 1` parcelas como `agenciamento` (usando schedule existente truncado/estendido — manter `agenciamento` como hoje; documentar como o usuário aciona — confirmar regra abaixo).
- Nova função `expectedVitalicioUntil(policy, config, referenceMonth, existing)`: a partir do mês da parcela configurada, gera comissão mensal recorrente (`amount = mensalidade * recorrenciaPct`) enquanto a apólice estiver ativa. Reaproveita a infra de `expectedRecurrencesUntil` (`useEffect` em `commissionStore.tsx` chama o equivalente).
- `kind` novo: `"vitalicio"`; label em `commissionKindLabel`.

A apólice mantém `commissionScheme` por apólice (override) — usuário pode escolher Vitalício no `NewPolicyDialog` para Saúde.

## 4. Saúde — campo Malha por seguradora

Adicionar tabela de **Malhas** ao store de configuração.

```ts
// commissionEngine.ts
type Malha = { id: string; insurer: Insurer; name: string; description?: string };

// CommissionConfig (saúde)
malhaId?: string; // malha vinculada à configuração atual
```

Novo bloco no `commissionConfigStore.tsx`:
- `malhas: Malha[]` (seed: 1 malha por seguradora, ex.: “Padrão”).
- API: `listMalhas(insurer)`, `addMalha(insurer, name)`, `updateMalha`, `removeMalha`.

UI no `ConfigCard` (Saúde):
- Campo **Malha** (Select de malhas da seguradora + botão "Nova malha…") exibido apenas para `defaultScheme in {"agenciamento", "vitalicio"}`.
- O Select edita `local.malhaId`. Persistido junto com o resto via `updateConfig`.

Uso downstream:
- `configForPolicy` injeta `malhaId` na config retornada para a apólice (sem alterar cálculo financeiro — Malha é metadado de classificação).
- Exibir o nome da malha em `MovementDetailsSheet` e `PolicyDetailDrawer` (linha “Malha: <nome>”) quando comissão for de Saúde.

## 5. Arquivos a tocar

```text
src/lib/financial/commissionEngine.ts          tipos: scheme "vitalicio", Malha, novos campos config, motor vitalicio
src/lib/financial/commissionConfigStore.tsx    seed dos novos campos + CRUD de malhas
src/lib/financial/commissionStore.tsx          ensureVitalicioForMonth (paralelo à recorrência)
src/components/settings/CommissionConfigSection.tsx  renomes, novos inputs, select de malha
src/components/portfolio/NewPolicyDialog.tsx   labels novos, tipo dinâmico p/ Seguros, opção Vitalício p/ Saúde
src/components/portfolio/EditPolicyDialog.tsx  idem
src/components/portfolio/RenewPolicyDialog.tsx idem
src/components/financial/MovementDetailsSheet.tsx  label “Adiantamento/Parcelado/Vitalício” + Malha
```

## Fora de escopo
- Migração de dados antigos: mockados já caem nos defaults novos.
- Recalcular comissões já geradas ao alterar `vitalicioStartInstallment` retroativamente.
- Editor avançado de malhas (descrição rica, histórico) — só CRUD básico nome.

## Perguntas (responda antes de implementar, se quiser ajustar)
1. **Vitalício, parcelas iniciais:** as parcelas antes do "A partir da parcela X" continuam como **Agenciamento** usando a lista de % já existente (`agenciamento: number[]`), ou devem ser zero (sem comissão antes da parcela X)?
2. **Malha — escopo:** Malha é apenas rótulo/classificação (sem impacto no cálculo), correto? Ou ela deve sobrescrever os % (agenciamento/recorrência) por malha?
3. **Defaults sugeridos** (Parcelado ≥ 5, Adiantamento ≤ 4, Vitalício a partir da 13ª) — ok ou prefere outros?
