# Unificar Apólices + Clientes em um único módulo com visão 360°

Hoje o módulo **Apólices** lista contratos isoladamente e não existe uma página de **Clientes** — o dado do cliente aparece só como string dentro da apólice. O plano é transformar esse módulo em **"Carteira"** com duas abas internas (**Apólices** e **Clientes**) compartilhando filtros visuais, e adicionar um drawer 360° por cliente.

## 1. Renomear módulo e ajustar navegação

- `src/components/shell/TopBar.tsx`: trocar label `"Apólices"` por `"Carteira"`; manter `key: "policies"` (sem mexer em rotas, store, ou em `ModuleKey`).
- Ícone permanece `FileText` (ou trocar por `Users` se preferir — decisão visual menor).

## 2. Novo container com abas — `src/components/modules/PortfolioModule.tsx`

Substitui `PoliciesModule` como módulo renderizado. Estrutura:

```text
<h1>Carteira</h1>
<p>Apólices e clientes em um só lugar</p>

<Tabs defaultValue="policies">
  <TabsList>
    <TabsTrigger value="policies">Apólices ({n})</TabsTrigger>
    <TabsTrigger value="clients">Clientes ({n})</TabsTrigger>
  </TabsList>

  <TabsContent value="policies"><PoliciesTab /></TabsContent>
  <TabsContent value="clients"><ClientsTab /></TabsContent>
</Tabs>
```

- `src/routes/index.tsx`: trocar `<PoliciesModule />` por `<PortfolioModule />`.
- `PoliciesTab` recebe o conteúdo atual de `PoliciesModule` (filtros + tabela + drawer da apólice) refatorado como subcomponente.

## 3. Nova aba **Clientes** — `ClientsTab`

Lista os 25 clientes mock derivando KPIs **on the fly** a partir de `policies`, `tasks`, `commissions` e `quotes`.

### Filtros (mesmo padrão visual da aba Apólices)
- Busca por nome / e-mail / documento.
- Filtro `Status` (cliente ativo = tem apólice ativa; inativo = só vencidas/canceladas; lead = sem apólice mas com oportunidade).
- Filtro `Ramo` (cliente possui apólice naquele ramo).

### Tabela desktop
| Cliente | Contato | Apólices ativas | Prêmio total/ano | Última atividade | Status |

### Cards mobile
Nome + iniciais, total de apólices, prêmio anual agregado, badge de status.

Clicar na linha abre o **drawer 360°**.

## 4. Drawer 360° — `src/components/portfolio/ClientDetailDrawer.tsx`

`Sheet` largo (`sm:max-w-2xl`) com 4 seções verticais:

### Bloco 1 — Cabeçalho
- Avatar com iniciais, nome, badge de status.
- Linha de contato: telefone, e-mail, documento.
- KPIs em 3 cartões: **Apólices ativas**, **Prêmio anual total**, **LTV estimado** (soma de todos os prêmios históricos).

### Bloco 2 — Apólices vinculadas
- Lista compacta de apólices do cliente (filtra `policies.clientName === client.name`).
- Cada item: número, ramo, seguradora, vigência, status badge, prêmio.
- Clicar abre o drawer existente de apólice (reutiliza estado de `PoliciesTab` via callback).

### Bloco 3 — Pipeline & cotações
- Oportunidades em aberto (filtra `tasks.clientName === client.name` e `stage !== "fechado" && stage !== "perdido"`).
- Cotações recentes (do `quoteStore`, agrupadas por `quoteGroupId`).
- CTA "Abrir no Quadro" → navega para módulo `kanban` via `NavigationProvider`.

### Bloco 4 — Timeline de atividade
- Eventos derivados: criação de apólice (data início), oportunidades criadas, cotações geradas, comissões pagas.
- Ordenado desc por data, máx 10 itens, com ícone + cor por tipo.

### Footer do drawer
- `Nova oportunidade` (abre `NewOpportunityDialog` pré-preenchido com cliente).
- `Nova cotação` (navega para `multicalc` com cliente selecionado — placeholder se não houver integração).

## 5. Helper de derivação — `src/lib/portfolio/clientStats.ts`

Funções puras que recebem os mocks e retornam visão agregada:

```ts
type ClientStats = {
  client: Client;
  activePolicies: number;
  totalPolicies: number;
  annualPremium: number;
  ltv: number;
  lastActivity: string;        // ISO
  status: "ativo" | "inativo" | "lead";
  branches: Branch[];
};

getClientStats(clientName: string): ClientStats
listClientsWithStats(): ClientStats[]
```

Centraliza a lógica para evitar `.filter()` espalhado pelos componentes.

## 6. Detalhes UX

- Abas mantêm `Tabs` do shadcn no mesmo padrão visual do módulo Quadro.
- Contagens entre parênteses no `TabsTrigger` ajudam orientação (`Apólices (24)`, `Clientes (25)`).
- Drawer da apólice (já existente) e drawer do cliente coexistem — ao abrir um pelo outro, o anterior fecha.
- Empty states em cada aba (ícone + frase + CTA).
- Responsivo: em <768px as abas viram tabs roláveis, drawer ocupa tela toda.

## 7. Arquivos tocados

**Novos**
- `src/components/modules/PortfolioModule.tsx`
- `src/components/portfolio/ClientsTab.tsx`
- `src/components/portfolio/ClientDetailDrawer.tsx`
- `src/lib/portfolio/clientStats.ts`

**Editados**
- `src/components/shell/TopBar.tsx` (label "Apólices" → "Carteira")
- `src/routes/index.tsx` (importa `PortfolioModule` no lugar de `PoliciesModule`)
- `src/components/modules/PoliciesModule.tsx` → renomeado internamente como `PoliciesTab` (mantendo o arquivo, exportando o subcomponente) **ou** copiado para `src/components/portfolio/PoliciesTab.tsx` e o arquivo antigo apagado. Recomendo a segunda opção para deixar o módulo de portfólio coeso.

**Sem mudanças**
- Rotas, `ModuleKey`, stores (`opportunityStore`, `quoteStore`, `taskStore`), tipos em `data.ts`.

## Fora do escopo desta entrega
- Aba "Serviços" (sinistros/endossos) — fica para uma segunda fase, conforme combinado.
- CRUD real de cliente (criar/editar) — hoje todos os clientes vêm do mock; o drawer é read-only + ações que abrem fluxos existentes.
- Persistência: nenhum dado novo é salvo, tudo é derivado dos mocks já em memória.
