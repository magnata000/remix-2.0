# Novos níveis de acesso: admin, Pós-venda e Vendedor

Substituição dos papéis `manager` e `broker` por `pos_venda` e `vendedor`, com regras aplicadas tanto no banco (segurança real) quanto na interface (menus e formulários).

## Papéis finais

| Papel | Financeiro | Configurações | Daily | Carteira (clientes/apólices) | Tarefas e Oportunidades |
|---|---|---|---|---|---|
| Administrador | tudo | tudo | sim | vê e edita tudo | vê e edita tudo, atribui a qualquer um |
| Pós-venda | sem acesso | sem acesso | sim | vê e edita tudo | vê tudo; edita/exclui só o que está no próprio nome |
| Vendedor | sem acesso | sem acesso | sem acesso | só o que ele vendeu | vê/edita/exclui só o próprio; cria sempre no próprio nome |

## Banco de dados

1. Novos valores no tipo de papel: `pos_venda` e `vendedor`.
2. Usuário existente com papel `broker` é excluído (registro de papel, cadastro na equipe e conta de acesso).
3. Recriação das regras de acesso, deixando de citar `manager`/`broker`:
   - Clientes, apólices, beneficiários, comissões, documentos, follow-ups: liberados para admin e pós-venda; vendedor só nos registros atribuídos a ele.
   - Financeiro (despesas, lançamentos, receitas manuais, impostos, repasses, configurações de comissão, taxas de vendedor): somente admin.
   - Tarefas e oportunidades: leitura para admin e pós-venda (todas) e vendedor (só as próprias); criação/edição/exclusão sempre restrita ao responsável, exceto admin.
   - Equipe: leitura para todos os autenticados; alteração somente admin.
4. Remoção final de `manager` e `broker` do tipo de papel.
5. O cadastro automático de novos usuários passa a criar papel `vendedor` por padrão (o primeiro usuário continua admin).

## Interface

- Novo hook de papel do usuário logado (`useRole`), lendo o papel real do banco.
- Barra de navegação: esconde Financeiro e Configurações para pós-venda e vendedor; esconde Daily para vendedor. Rotas correspondentes redirecionam para a Carteira quando acessadas sem permissão.
- Tarefas e oportunidades: para pós-venda e vendedor, o campo "Responsável" fica fixo no próprio usuário nos formulários de criação; botões de editar/excluir aparecem apenas nos itens do próprio usuário.
- Configurações → Equipe: o cargo passa a refletir e gravar o papel real (Administrador / Pós-venda / Vendedor), substituindo a lista de texto livre atual. Apenas admin pode alterar.

## Detalhes técnicos

- Migração em duas etapas para o enum `app_role` (adicionar valores em uma transação, depois recriar políticas e remover os valores antigos), pois o Postgres não permite usar um valor de enum criado na mesma transação.
- `has_role` permanece a função de verificação (security definer); as políticas usam `has_role(auth.uid(),'admin')`, `has_role(auth.uid(),'pos_venda')`.
- `src/lib/auth/profile.functions.ts`: papel padrão passa de `broker` para `vendedor`; retorna também o papel para o front.
- `src/lib/team/teamStore.tsx` deixa de usar cargos de texto mock e passa a ler/gravar em `user_roles` + `team_members` via server functions.
- `src/lib/featureFlags.ts` continua controlando o Multicálculo; o gate por papel é separado.
