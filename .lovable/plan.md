# Campo Vendedor com usuários reais (Nova Apólice)

## Problema

No formulário de Nova Apólice, a lista do campo "Vendedor" vem de uma lista fictícia de 4 nomes (Ana Souza, Carlos Lima, Mariana Alves, João Pereira) embutida no código de demonstração. Ela não tem relação com os usuários realmente cadastrados na corretora, então a apólice acaba atribuída a um responsável inexistente.

## O que muda

- O campo "Vendedor" passa a listar os colaboradores reais cadastrados (mesma fonte usada no Pipeline de Vendas e em Configurações > Equipe).
- Padrão de seleção: o próprio usuário logado.
- Mesma regra de permissão já aplicada no Pipeline: admin e pós-venda podem escolher qualquer vendedor; um vendedor só pode atribuir a si mesmo.
- Na renovação de apólice, o vendedor pré-preenchido continua sendo o da apólice original.
- Enquanto a lista de usuários carrega, o campo exibe um estado neutro em vez de um nome falso.

## Detalhes técnicos

- `src/components/portfolio/NewPolicyDialog.tsx`: trocar o import de `team` de `@/lib/mock/data` por `useTeam()` (`src/lib/team/teamStore.tsx`) e `useRole()` (`src/lib/auth/roleStore.tsx`).
- Inicialização/reset de `assigneeId` passa a usar `userId` do `useRole()`; no prefill de renovação mantém `src.assigneeId`.
- Filtro `assignable = appRole !== "vendedor" ? members : members.filter(m => m.id === userId)`, espelhando `NewOpportunityDialog.tsx`.
- Nenhuma mudança de banco: `policies.assignee_id` já referencia `team_members`.
