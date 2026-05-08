## Objetivo

Adicionar histórico versionado de cotações no módulo Multicálculo, com edição que gera nova versão automaticamente, comparação entre versões e gestão de status (ganha/perdida/expirada).

## Mudanças no Multicálculo

Transformar o módulo em uma estrutura com **3 abas** no topo:

1. **Nova cotação** — wizard atual (Cliente → Objeto → Coberturas → Resultado)
2. **Histórico** — lista de todas as cotações geradas, agrupadas por cliente
3. **Comparar** — ativada ao selecionar 2+ versões no Histórico

Ao concluir o wizard e selecionar uma seguradora, a cotação é automaticamente salva no Histórico como **v1** com status "Em aberto".

## Aba Histórico

Lista agrupada por cliente, cada grupo mostra:
- Nome do cliente + ramo + data da última atualização
- Badge com nº de versões (ex: "3 versões")
- Status atual (Em aberto / Ganha / Perdida / Expirada)

Ao expandir o cliente, mostra timeline vertical de versões:
- v1, v2, v3… com data, autor, seguradora vencedora, prêmio
- Pequeno resumo do que mudou vs versão anterior (ex: "+ Vidros, CEP alterado")
- Ações por versão: **Editar (gera nova versão)**, **Duplicar**, **Ver detalhes**, **Marcar como ganha/perdida**

Filtros no topo: por cliente, status, ramo, período.

## Edição → Nova versão automática

Ao clicar em "Editar" numa versão:
- Abre o wizard pré-preenchido com os dados daquela versão
- Banner no topo: "Editando v2 de João Silva — uma nova versão será criada ao salvar"
- Ao recalcular, gera **vN+1** vinculada à mesma cotação-mãe (groupId)
- A versão anterior fica preservada (imutável)
- Captura diff (campos alterados) para exibir no histórico

## Aba Comparar (toggle de visualização)

Acionada ao marcar checkboxes de 2+ versões no Histórico, com **toggle no topo**:

**Modo Tabela** (default desktop):
- Colunas = versões (v1, v2, v3)
- Linhas = campos (CEP, Cobertura terceiros, Vidros, Carro reserva… + preço por seguradora)
- Células com diferença destacadas em amarelo
- Linha "Melhor preço" no rodapé

**Modo Timeline** (default mobile):
- Cards verticais por versão
- Cada card expansível mostra apenas o que mudou em relação à anterior
- Preço destacado, badges de "Mais barata" / "Mais coberturas"

## Status e expiração

- Status manuais: **Em aberto** (default), **Ganha**, **Perdida** (com motivo: preço, cobertura, prazo, sem retorno, outro)
- **Expiração automática**: cotações em "Em aberto" há mais de 30 dias sem nova versão viram "Expirada" (calculado on-the-fly a partir da data, sem job)
- Cotação "Ganha" exibe link visual para gerar apólice (placeholder por ora)

## Mock e estado

- Estender `src/lib/mock/data.ts` com tipo `QuoteRecord` (groupId, version, clientId, createdAt, createdBy, status, lostReason?, formData, results[], winnerInsurer)
- Seed com ~6 grupos de cotação (2-4 versões cada) cobrindo todos os status
- Estado vivo (novas cotações da sessão) em Context simples ou Zustand-like via useState + provider local ao módulo, sem persistência (apenas vitrine)

## Mobile

- Abas viram dropdown segmentado
- Histórico vira lista de cards (sem timeline expandida — toque abre sheet com versões)
- Comparar força modo Timeline

## Arquivos previstos

- `src/components/modules/MulticalcModule.tsx` — adicionar Tabs, encapsular wizard atual em `MulticalcWizard.tsx`
- `src/components/multicalc/MulticalcWizard.tsx` (novo, extraído do atual + suporte a `initialData` e `editingVersion`)
- `src/components/multicalc/QuoteHistory.tsx` (novo)
- `src/components/multicalc/QuoteCompare.tsx` (novo, com toggle Tabela/Timeline)
- `src/components/multicalc/QuoteVersionCard.tsx` (novo)
- `src/components/multicalc/StatusBadge.tsx` (novo)
- `src/lib/mock/data.ts` — novos tipos + seed
- `src/lib/multicalc/quoteStore.ts` (novo) — estado em memória + helpers (createVersion, computeDiff, isExpired)

## Critérios de aceitação

1. Concluir o wizard cria automaticamente v1 visível no Histórico
2. Editar uma versão pré-preenche o wizard e, ao salvar, gera nova versão sem alterar a anterior
3. Histórico mostra diff resumido entre versões
4. Comparar permite alternar entre tabela e timeline
5. Status "Ganha/Perdida" pode ser definido manualmente, com motivo no caso de perdida
6. Cotações antigas (>30 dias sem nova versão) aparecem como "Expirada"
7. Tudo responsivo no breakpoint de 1051px e abaixo