# Diagnóstico: nenhum dado aparece na Carteira

## O que está acontecendo (verificado)

O banco está cheio — 138 clientes, 152 apólices — mas as consultas retornam vazio porque as regras de acesso filtram por responsável:

- Os 138 clientes importados estão vinculados aos três corretores placeholder ("Corretor importado 1/2/3"), não à sua conta.
- Sua conta (caiogn07@gmail.com) está registrada com papel **broker**, não admin. A resposta do servidor confirma `isAdmin: false`.
- As políticas de acesso permitem ver apenas registros onde o responsável é o próprio usuário, ou tudo caso seja admin. Broker + registros de outro responsável = lista vazia.

Isso é comportamento correto das regras de segurança, não um bug de código. O papel "primeiro usuário vira admin" não te contemplou porque outro registro (QA Tester) já existia quando você entrou.

## Solução proposta

1. **Promover sua conta a admin** — inserir o papel admin para caiogn07@gmail.com e atualizar seu registro de colaborador. Isso já libera a visão completa de clientes, apólices, beneficiários e follow-ups.
2. **Reatribuir os registros importados para você** — trocar o responsável dos 138 clientes e 152 apólices dos corretores placeholder para a sua conta, para que os dados tenham dono real.
3. **Remover os corretores placeholder** após a reatribuição, deixando apenas usuários reais na equipe.
4. **Verificar na interface** que a página Carteira lista clientes e apólices, e que a Daily e o Caixa passam a calcular comissões.

## Detalhes técnicos

- Migração SQL: `INSERT INTO user_roles (user_id, role) VALUES ('<uid do Caio>', 'admin')` com `ON CONFLICT DO NOTHING`; `UPDATE team_members SET role='admin'` para o mesmo id.
- `UPDATE public.clients SET assignee_id = '<uid>' WHERE assignee_id IN (placeholders)`; idem para `public.policies`. Beneficiários e follow-ups herdam acesso via cliente/apólice.
- `DELETE FROM public.team_members WHERE email LIKE '%@insuranceos.local'` após a reatribuição (sem registros dependentes restantes).
- Nenhuma alteração de política RLS é necessária.
