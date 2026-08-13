# Migração para o banco real (Lovable Cloud) — Fase 1

Objetivo: sair dos dados de demonstração e passar a gravar tudo em um banco de verdade no Lovable Cloud, com login (e-mail/senha + Google) e acesso restrito por usuário. Começando pela Carteira.

## Etapas

### 1. Banco de dados
- Ativar o Lovable Cloud gerenciado (o Supabase próprio configurado hoje deixa de ser usado).
- Rodar o script de criação completo já documentado em `docs/schema_initial.sql`: equipe, papéis, clientes, apólices, beneficiários, comissões, configurações de comissionamento, oportunidades, tarefas, despesas, receitas manuais, impostos, comissões/repasses de vendedores e pastas/arquivos de documentos.
- Complementos que faltam no script atual: tabela `follow_ups` (a feature já existe na interface) e `profiles` ligada ao usuário autenticado.
- Banco criado vazio: nenhum cliente, apólice ou comissão fictícia. Você cadastra os dados reais pela interface.
- Toda tabela com segurança por linha ativada: cada usuário só lê e escreve os registros da própria corretora; papéis (admin/corretor/financeiro) ficam em tabela separada.

### 2. Login
- Nova tela pública de login/cadastro com e-mail e senha **e botão “Entrar com Google”**.
- O aplicativo passa a exigir sessão: a área interna (Daily, Carteira, Kanban, Financeiro, Documentos, Configurações) fica atrás do acesso autenticado; sem sessão, o usuário é levado ao login.
- Perfil criado automaticamente no primeiro acesso; menu de conta no topo com “Sair”.
- Recuperação de senha por e-mail com página própria para definir a nova senha.

### 3. Troca dos dados (Fase 1 — Carteira)
- Clientes, Apólices, Beneficiários e Follow-ups passam a ler e gravar no banco.
- Cada tela mostra estado de carregamento e de erro; nada mais é perdido ao recarregar a página.
- Os dados de demonstração dessas áreas são removidos do código.

### 4. Fases seguintes (depois desta entrega)
- Fase 2: Kanban (oportunidades, tarefas, agendamentos).
- Fase 3: Financeiro (comissões, caixa, despesas, impostos, repasses).
- Fase 4: Documentos, Equipe/Configurações e remoção final do arquivo de mocks.

## Detalhes técnicos

- Ativação via `supabase--enable`; schema aplicado por migration (tabelas + `GRANT` + RLS + policies + triggers), derivado de `docs/schema_initial.sql`.
- Acréscimos ao script: `public.profiles` (FK `auth.users`, trigger `on_auth_user_created`), `public.follow_ups` (client_id, date, time, type, status, notes, created_task_id), colunas `owner_id`/`org_id` onde necessário para as policies.
- Papéis: enum `app_role` + tabela `user_roles` + função `has_role` (security definer) — nunca papel dentro de `profiles`.
- Rotas: `src/routes/index.tsx` vira landing/redirecionamento público; a aplicação passa para `src/routes/_authenticated/app.tsx` com o layout gerenciado `_authenticated/route.tsx`; `/auth` e `/reset-password` públicas.
- Google: `lovable.auth.signInWithOAuth("google")` + `supabase--configure_social_auth`.
- Leituras/escritas por `createServerFn` com `requireSupabaseAuth` em `src/lib/**.functions.ts`, consumidas via TanStack Query; os stores atuais (`clientStore`, `policyStore`, `followUpStore`) mantêm a mesma assinatura de hooks para não quebrar as telas.
- Testes do Vitest que dependem de mocks da Carteira serão ajustados para fixtures locais.
