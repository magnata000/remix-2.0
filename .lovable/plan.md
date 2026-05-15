# Relação Pipeline de Vendas ↔ Multicálculo

Hoje os dois módulos vivem em silos: o Kanban tem `Task` (oportunidade com etapa, valor estimado, responsável) e o Multicálculo tem `QuoteRecord` agrupado por `groupId` (cotações com versões, vencedora, status ganha/perdida). Eles tratam do mesmo cliente e da mesma venda, mas não se enxergam.

A proposta: tratar a **oportunidade do Kanban como a entidade-mãe** e as **cotações do Multicálculo como filhas dessa oportunidade**.

## Modelo conceitual

```text
Oportunidade (Kanban)
├── Cliente, ramo, responsável, valor estimado, etapa
└── Cotações (Multicálculo)
    ├── v1 — coberturas A → vencedora: SulAmérica R$ 1.200
    ├── v2 — coberturas B → vencedora: Porto    R$ 1.350
    └── v3 — coberturas C → vencedora: SulAmérica R$ 1.180  ← escolhida
```

Uma oportunidade tem 0..N grupos de cotação. Na prática o normal é **1 oportunidade ↔ 1 grupo de cotação** (mesmo cliente + ramo), mas o modelo permite mais de um grupo se o corretor cotar Auto e Vida para o mesmo lead.

## Regras de sincronização (a parte que dá funcionalidade real)

**Etapa do Kanban derivada das cotações:**


| Estado das cotações                   | Etapa sugerida |
| ------------------------------------- | -------------- |
| Nenhuma cotação ainda                 | Lead           |
| 1+ cotação em aberto                  | Cotação        |
| Cotação enviada ao cliente / proposta | Negociação     |
| Cotação marcada como "ganha"          | Fechado        |
| Cotação "perdida" em todas as versões | Perdido (col.) |


A movimentação é **sugestão automática, não imposição** — o corretor pode mover manualmente, mas o card mostra um aviso "esta etapa não bate com o status da cotação".

**Status do Multicálculo reflete na oportunidade:**

- Marcar cotação como "ganha" → move card para Fechado e preenche `valorFechado`. Abre-se um modal perguntando qual versão daquele grupo foi fechada.
- Marcar como "perdida" + motivo → move para coluna Perdido e registra o motivo no card.

## Mudanças concretas

### 1. Card do Kanban mostra a cotação vinculada

Cada `Task` ganha um campo opcional `quoteGroupId`. No card aparece um chip discreto:

```text
┌──────────────────────────────────┐
│ Renovação Auto — João Silva      │
│ [Auto]                  R$ 2.840 │
│ 📋 3 cotações · v3 vencedora     │  ← novo
│ 📅 12/05      [AS]               │
└──────────────────────────────────┘
```

Clicar no chip abre o Multicálculo já filtrado naquele grupo.

### 2. Botão "Abrir cotação" no card

No menu `...` do card: **"Abrir cotação"** (vai para Multicálculo > Histórico) ou **"Nova cotação"** se ainda não existir (vai para Multicálculo > Nova com cliente pré-preenchido).

### 3. Botão "Vincular a oportunidade" no Multicálculo

No `QuoteHistory`, em cada grupo, um botão discreto:

- Se já vinculado: chip "🔗 No pipeline · Negociação" (clicável → Kanban)
- Se não vinculado: "Adicionar ao pipeline" → cria uma `Task` nova com cliente, ramo, valor estimado (= preço da vencedora) já preenchidos.

### 4. Ao salvar uma cotação "ganha"

Diálogo já existente "Marcar como ganha" passa a perguntar:

- ☑ Mover oportunidade para "Fechado" no pipeline
- ☑ Atualizar valor do card com R$ X (preço da vencedora)

### 5. Coluna "Perdido" no Kanban

Hoje só existem 4 etapas. Adicionar uma 5ª coluna **"Perdido"** (colapsada por padrão) para acomodar oportunidades cuja cotação foi marcada como perdida — sem isso o status "perdida" do Multicálculo não tem onde aterrissar.

## Detalhes técnicos

- **Store compartilhado**: criar `src/lib/pipeline/opportunityStore.ts` (provider) ou mesclar com `quoteStore`. Recomendo um provider novo `PipelineStoreProvider` que envolve `MulticalcModule` e `KanbanModule` no `routes/index.tsx`, expondo `opportunities` + helpers de vinculação.
- **Tipo `Task**`: adicionar `quoteGroupId?: string` e `lostReason?: LostReason`.
- **Tipo `QuoteRecord` / grupo**: adicionar `opportunityId?: string` (espelho do vínculo).
- **Derivação de etapa**: helper puro `suggestStage(opportunity, group): KanbanStage` que o card usa para mostrar o aviso de divergência.
- **Mock data**: vincular as oportunidades atuais (`tasks`) aos `groupIds` do `quoteStore` para a demo já abrir conectada (ex: João Silva — g1, Mariana — g2, Carlos — g3).
- Sem mudanças de backend agora — tudo em memória como o resto do app.

## Critérios de aceitação

- Card do Kanban com cotação vinculada mostra contagem de versões e vencedora atual.
- Clicar no card leva ao Multicálculo já no grupo certo.
- Marcar cotação como ganha sugere mover para Fechado e atualiza valor.
- Marcar como perdida move para nova coluna Perdido com motivo.
- Cotações sem oportunidade têm CTA "Adicionar ao pipeline".
- Oportunidades sem cotação têm CTA "Nova cotação".
- Aviso visual quando etapa do Kanban diverge do status real da cotação.

## O que **não** faz parte deste plano

- Persistência real (ainda em memória).
- Múltiplos grupos de cotação por oportunidade na UI (modelo permite, UI fica para depois).
- Histórico de movimentações / auditoria.