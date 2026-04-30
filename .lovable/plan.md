
# Plano — TheInsuranceOS (Vitrine Interativa Mock)

## Visão geral
App-shell único em `/` simulando o sistema operacional para corretoras de seguros, com **6 módulos navegáveis** e dados 100% mockados. Estética **Bento Grid clean minimalist** com paleta **Azul Bebê + brancos/cinzas** (conforme PDF atualizado), fonte **Inter**.

## Estrutura de navegação

- **Desktop**: Top bar fixa com logo "TheInsuranceOS" (azul bebê), navegação central (Dashboard, Apólices, Kanban, Multicálculo, Financeiro, Configurações), busca, notificações e avatar.
- **Mobile**: Top bar enxuta + **drawer lateral** (sheet) acionado por ícone hambúrguer, com a mesma navegação empilhada verticalmente.
- Rota única `/` com state de módulo ativo (sem múltiplas rotas para manter simplicidade da vitrine).

## Módulos

### 1. Dashboard
Bento Grid com:
- 4 KPIs no topo (Apólices Ativas, Novos Clientes, Sinistros Abertos, Receita do Mês) — cartão destacado em azul bebê
- Gráfico de barras "Performance de Vendas" (12 meses) com barra do mês atual em azul bebê
- Gráfico radial "Taxa de Renovação" em laranja com centro azul
- Tabela "Apólices Recentes" com status coloridos

### 2. Apólices
- Tabela responsiva com filtros (status, ramo, vigência)
- Colunas: cliente, número, ramo, seguradora, prêmio, vigência, status (badge)
- Linha clicável → drawer lateral com detalhes da apólice
- Em mobile: vira lista de cards

### 3. Kanban (Tarefas/Pipeline)
- **Desktop**: 4 colunas horizontais (Lead, Cotação, Negociação, Fechado) com drag-and-drop visual
- **Mobile**: 
  - Tabs no topo para alternar entre colunas (uma coluna visível por vez)
  - Botão "Mover" em cada card abre menu para escolher coluna destino
  - Indicador de coluna atual + contador de cards
- Cards mostram: cliente, ramo, valor estimado, prazo, avatar do responsável

### 4. Multicálculo
- Formulário em etapas (stepper): dados do cliente → veículo/objeto → coberturas
- Resultado: grid comparativo com 4-5 seguradoras mock (preço, coberturas, franquia, botão "Selecionar")
- Card vencedor destacado em azul bebê

### 5. Financeiro
- KPIs: Comissões a Receber, Recebido no Mês, Inadimplência, Ticket Médio
- Gráfico de linhas: receita vs comissões (12 meses)
- Tabela de comissões com status (pago/pendente/atrasado)

### 6. Configurações
- Seções: Perfil da Corretora, Equipe (lista de usuários mock), Integrações (cards de seguradoras conectáveis), Preferências (tema, notificações), Plano & Faturamento

## Design System

**Tokens de cor (oklch em `src/styles.css`)**:
- `--brand` (Azul Bebê): `oklch(0.82 0.08 230)` — primário, botões, seleção, destaques
- `--brand-foreground`: branco
- `--background`: `oklch(0.98 0.005 250)` — cinza claro do dashboard
- `--card`: branco puro
- `--foreground`: `oklch(0.18 0.01 250)` — preto suave
- `--muted-foreground`: cinza médio
- Status: laranja (warning/novos), azul suave (info), verde (success), vermelho (danger) — uso pontual

**Tipografia**: Inter via Google Fonts. Bold para títulos/números, Regular para apoio.

**Componentes-chave**: Cards arredondados (`rounded-2xl`), sombras suaves (`shadow-sm`), bordas 1px cinza claro, ícones Lucide outline com círculos coloridos de fundo.

## Estados e qualidade

- **Loading**: Skeletons em todos os cartões/tabelas (Skeleton do shadcn)
- **Empty states**: Ilustração simples + CTA quando filtros não retornam resultados
- **Erros**: Toast (Sonner) com mensagem descritiva quando algo falha (ex: falha simulada de cotação)
- **Acessibilidade**: contraste AA garantido para o azul bebê sobre branco (texto em preto, não no azul); foco visível; navegação por teclado no kanban
- **Responsividade**: breakpoint principal `md` (768px); top bar colapsa em drawer; tabelas viram cards; kanban vira tabs

## Mock data

Estrutura em `src/lib/mock/`:
- `clients.ts`, `policies.ts`, `tasks.ts`, `quotes.ts`, `commissions.ts`, `team.ts`
- 15-30 registros por entidade com nomes brasileiros, ramos reais (auto, vida, residencial, empresarial, saúde) e seguradoras (Porto, Bradesco, SulAmérica, Allianz, Mapfre)
- Schemas TypeScript genéricos conforme solicitado

## Detalhes técnicos

- TanStack Start, rota única `/` em `src/routes/index.tsx`
- Estado de módulo ativo via `useState` no shell + componente por módulo em `src/components/modules/`
- Top bar e drawer em `src/components/shell/`
- shadcn/ui: Sheet (drawer mobile), Tabs (kanban mobile), Table, Card, Badge, Skeleton, Sonner, Dialog, Tooltip
- Recharts para gráficos
- Sem backend / sem Lovable Cloud nesta versão (puro mock)

## Critérios de aceitação

1. Navegação funcional entre os 6 módulos no desktop e via drawer no mobile
2. Todos os módulos renderizam com dados mock visíveis (sem telas vazias por padrão)
3. Kanban permite mover cards entre colunas em desktop (drag) e mobile (menu)
4. Paleta azul bebê aplicada de forma consistente; zero resquício de roxo
5. Layout sem quebras em viewports de 360px, 768px e 1280px
6. Skeletons aparecem brevemente no carregamento inicial de cada módulo
7. Toasts de erro aparecem em ações simuladas que falham (ex: botão "Recalcular" com falha mock)
