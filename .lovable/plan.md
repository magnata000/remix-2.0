
## Objetivo

Transformar a aba **Repasses de vendedores** em fluxo transacional real: calcular saldo devedor acumulado por vendedor, permitir quitação (total ou parcial) via botão **Pagar**, registrar a transação em **Movimentações** e substituir a box atual por um **Histórico de repasses**.

## 1. Novo store `sellerPayoutStore.tsx`

Arquivo: `src/lib/financial/sellerPayoutStore.tsx` (padrão Context+Provider, igual a `cashStore`).

Tipo:
```ts
type SellerPayout = {
  id: string;
  sellerId: string;
  amount: number;
  paidAt: string;   // ISO
  notes?: string;
};
```

API:
- `payouts: SellerPayout[]`
- `addPayout(data)` → cria e retorna
- `removePayout(id)` → para casos de estorno futuro (não usaremos na UI ainda, mas expor)
- `totalPaid(sellerId)` → soma histórica de repasses do vendedor
- Seed vazio.

Provider registrado no root (mesmo lugar de `SellerCommissionStoreProvider`).

## 2. Extensões em `sellerCommissionStore`

Adicionar helpers (sem alterar contrato existente):

- `computeSellerOwed(sellerId, commissions, policies)`: soma `computePayout(c, p)` para todas as comissões `status === "pago"` cuja `policy.assigneeId === sellerId` (all-time — não filtra por mês).
- `getSellerBalance(sellerId, ...)`: `computeSellerOwed - totalPaid` (do payout store).

Alternativa mais limpa: manter esses cálculos como funções puras dentro do próprio `SellerCommissionsTab` usando `useMemo`, sem tocar no store. **Escolha:** manter puro no componente (menor acoplamento), já que ambos os stores estão disponíveis.

## 3. Novo modal `PaySellerPayoutDialog.tsx`

Local: `src/components/financial/PaySellerPayoutDialog.tsx`.

Props: `{ open, onOpenChange, seller, suggestedAmount }`.

Conteúdo:
- Título: "Confirmar repasse".
- Texto explicativo: "Você está registrando um repasse para **{seller.name}**."
- Campo **Valor** (Input numérico, formato BRL): pré-preenchido com `suggestedAmount` (saldo total), **editável**.
- Validações:
  - `> 0`
  - `≤ saldo devedor atual` (bloquear overpay; mostrar helper "Saldo devedor: R$ …")
- Campo **Data de pagamento** (default hoje).
- Campo **Observações** (opcional).
- Botão "Confirmar" → chama `addPayout({ sellerId, amount, paidAt, notes })` + toast de sucesso.

## 4. Integração em `CaixaTab` (Movimentações)

Em `src/components/financial/CaixaTab.tsx`, adicionar quarta fonte no `useMemo` de `movements`:

```ts
const fromPayouts = payouts.map((p) => ({
  id: `pay-${p.id}`,
  kind: "saida" as const,
  date: formatDateTimeBR(p.paidAt),
  description: `Repasse · ${sellerNameById(p.sellerId)}`,
  amount: p.amount,
  details: { kind: "repasse", payout: p },
  _sortIso: p.paidAt,
}));
```

- Estender `Movement` type em `MovementDetailsSheet.tsx` com variante `{ kind: "repasse"; payout: SellerPayout; sellerName: string }`.
- Renderizar detalhes básicos no sheet (vendedor, valor, data, notas).
- KPIs de Caixa: repasses já entram como `saida` naturalmente (Entradas/Saídas/Saldo atualizados).

## 5. Reformulação da `SellerCommissionsTab`

Arquivo: `src/components/financial/SellerCommissionsTab.tsx`.

Mudanças cirúrgicas:

**5.1 Card "Total a Repassar"**
- Deixa de depender do mês. Mostra `sellerBalance = totalOwedAllTime - totalPaidAllTime`.
- Subtítulo: "Saldo devedor acumulado · {sellerHistoryCount} comissão(ões) contabilizada(s)".
- Botão **Pagar** no canto superior direito do card, desabilitado se `sellerBalance <= 0`.
- Ao clicar → abre `PaySellerPayoutDialog` com `suggestedAmount = sellerBalance`.

**5.2 Filtro global**
- Escopo do seletor de mês passa a ser apenas o Histórico de repasses. Ajustar texto: "Filtro do histórico".

**5.3 Configuração de %**
- Sem alteração.

**5.4 Substituição da box "Histórico de comissões pagas"**
- **Remover** o Card atual completamente.
- **Novo Card "Histórico de repasses"** — mesmo estilo visual do Caixa/Movimentações:
  - Colunas: Data · Vendedor (sempre o selecionado, mas útil pra clareza) · Valor · Observações · Ações (excluir opcional; por ora só visual).
  - Filtrado por: `payout.sellerId === sellerId && mês/ano do filtro`.
  - Linha de total no rodapé: soma dos repasses exibidos.
  - Empty state coerente.

## 6. Registro do Provider

Localizar onde `SellerCommissionStoreProvider` está montado (provavelmente `src/routes/__root.tsx` ou `router.tsx`) e adicionar `SellerPayoutStoreProvider` ao lado — antes de `SellerCommissionStoreProvider` para permitir importar seu hook em componentes descendentes.

## 7. Fora de escopo

- **DRE**: repasses não são tratados como despesa do DRE nesta iteração (não foi solicitado). Se necessário depois, mapear em `computeDre`.
- **Estorno** de repasse: `removePayout` fica exposto no store mas sem UI.
- **Multi-vendedor lump sum** (pagar vários de uma vez): não solicitado.

## Arquivos afetados

- `src/lib/financial/sellerPayoutStore.tsx` (novo)
- `src/components/financial/PaySellerPayoutDialog.tsx` (novo)
- `src/components/financial/SellerCommissionsTab.tsx` (refatoração)
- `src/components/financial/CaixaTab.tsx` (adiciona fonte payouts)
- `src/components/financial/MovementDetailsSheet.tsx` (nova variante repasse)
- `src/routes/__root.tsx` ou equivalente (registro do provider)
