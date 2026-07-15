## Objetivo

Aplicar as correções fornecidas pelo usuário ao `docs/DATABASE_SCHEMA.md`, substituindo/adicionando duas seções no dicionário técnico:

1. **Trigger de sincronização `auth.users → public.team_members`** (nova subseção).
2. **RLS corrigida de `user_roles`** (substitui as policies anteriores que causavam recursão via `has_role`).

## Alterações em `docs/DATABASE_SCHEMA.md`

### 1. Nova subseção — "Sincronização automática de usuários"
Adicionada logo após o DDL de `team_members` / `user_roles`, com:
- Explicação curta: novo usuário no Supabase Auth é clonado para `team_members` e recebe entrada em `user_roles`, evitando "limbo" de `assignee_id`.
- Bloco SQL com `handle_new_user()` (SECURITY DEFINER, `search_path=public`, fallbacks para `name`/`role` via `raw_user_meta_data`, `ON CONFLICT DO NOTHING` em `user_roles`).
- Bloco SQL com o trigger `on_auth_user_created` (`AFTER INSERT ON auth.users`).

### 2. Substituição — Policies de `user_roles`
- Remover as policies antigas do documento (que usavam `has_role` sobre a própria `user_roles`, causando recursão).
- Inserir as novas:
  - `Self read roles` (SELECT, `user_id = auth.uid()`).
  - `Admin manage roles` (ALL, checa `team_members.role = 'admin'` em vez de `user_roles` — quebra a recursão).
- Adicionar nota em negrito explicando **por que** a checagem de admin vai contra `team_members` e não contra `user_roles`/`has_role`.

### 3. Ajustes de coerência
- Manter `has_role()` documentada como utilitária para **outras** tabelas (clients, policies, etc.), mas com um aviso: **nunca usar `has_role` em policies da própria `user_roles`** — usar o padrão via `team_members`.
- Verificar que o enum de roles referenciado (`'admin'`, `'broker'`, `app_role`) bate com o restante do documento; se o dicionário atual usa outro conjunto (ex.: `'Administrador'`), acrescentar nota conciliando o enum SQL (`admin`/`broker`/...) com os labels TS.

## Fora de escopo
- Nenhuma alteração em código de aplicação.
- Nenhuma alteração em arquivos protegidos.
- Não executar migrations — o documento continua sendo apenas a Fonte Única de Verdade.

## Verificação
- `docs/DATABASE_SCHEMA.md` renderiza os novos blocos SQL corretamente.
- Typecheck/lint não são afetados (apenas markdown).
