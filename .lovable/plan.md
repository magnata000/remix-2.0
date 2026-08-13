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

## Limpeza dos dados mock do Financeiro

A página Financeiro ainda parte de dados fictícios embutidos no código (aluguel, software CRM, campanha de marketing, bônus de performance, PIS/COFINS e IRPJ). Nesta etapa:

1. **Zerar as sementes fictícias** de despesas, lançamentos pagos, receitas manuais e impostos — o Caixa e o DRE passam a iniciar vazios e refletir apenas o que for registrado de verdade.
2. **Comissões calculadas das apólices reais** — o motor de comissionamento passa a gerar as parcelas a partir das 152 apólices importadas (agenciamento, recorrência Saúde, parcelado Auto etc.), sem nenhuma comissão fictícia de base.
3. **Verificar Caixa, Repasses, Relatório e DRE** com os números reais: receita vinda das comissões geradas, despesas em zero até o primeiro registro do usuário.

## Detalhes técnicos

- Migração SQL: `INSERT INTO user_roles (user_id, role) VALUES ('<uid do Caio>', 'admin')` com `ON CONFLICT DO NOTHING`; `UPDATE team_members SET role='admin'` para o mesmo id.
- `UPDATE public.clients SET assignee_id = '<uid>' WHERE assignee_id IN (placeholders)`; idem para `public.policies`. Beneficiários e follow-ups herdam acesso via cliente/apólice.
- `DELETE FROM public.team_members WHERE email LIKE '%@insuranceos.local'` após a reatribuição (sem registros dependentes restantes).
- Nenhuma alteração de política RLS é necessária.
- `src/lib/cash/cashStore.tsx`: remover `seedExpenses`, `seedEntries`, `seedIncomes`, `seedTaxes` e os helpers de datas mock, inicializando os estados com `[]`.
- `src/lib/financial/commissionStore.tsx`: já parte de `commissions` vazio em `src/lib/mock/data.ts`; as comissões passam a vir do efeito de geração sobre as apólices reais. Remover o import da semente mock.

