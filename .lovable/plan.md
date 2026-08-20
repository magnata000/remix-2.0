# Corrigir o fluxo de apólices e comissões

## Diagnóstico confirmado

- As 5 apólices cadastradas em **19/08/2026** continuam no banco e estão atribuídas ao usuário correto. Portanto, as apólices não foram apagadas.
- Todas foram cadastradas como **Auto + esgotamento/adiantamento**. Nesse modelo, o sistema define o vencimento da comissão como **início da vigência + 30 dias**. Por isso, apólices iniciadas em agosto geraram previsão para setembro; o relatório agrupa a comissão pelo vencimento, não pela data de cadastro da apólice.
- Essas 5 apólices possuem **zero comissões persistidas**. O cadastro da apólice foi salvo, mas a geração da comissão era uma segunda operação assíncrona e não aguardada; ao recarregar, a parcela que existia apenas no estado da tela desapareceu.
- O banco atualmente contém somente recorrências de Saúde e elas estão duplicadas: **744 registros para 372 competências únicas**. O efeito automático de geração pode executar simultaneamente em mais de uma montagem antes de uma delas enxergar a gravação da outra.
- A consulta de comissões já ordena por vencimento e o drawer também ordena a agenda. A percepção de desordem vem principalmente da duplicidade e do uso de datas diferentes conforme o contexto (`dueDate`, `paidAt` ou `refundedAt`), sem um critério visual único claramente indicado.

## Melhor caminho

### 1. Tornar a geração persistente e idempotente

- Fazer o cadastro aguardar a confirmação da apólice **e** das comissões antes de concluir e fechar o formulário.
- Trocar a criação livre por uma sincronização idempotente: a mesma competência da mesma apólice não poderá ser criada duas vezes.
- Exibir erro claro e permitir nova tentativa se a apólice for salva, mas a comissão falhar.

### 2. Bloquear duplicidades no banco

- Remover somente as duplicatas exatas já existentes, preservando um registro por apólice, vencimento e tipo.
- Criar uma restrição única para impedir novas duplicidades mesmo com duas telas ou usuários executando a geração ao mesmo tempo.
- Ajustar a geração automática de Saúde para usar `upsert`/sincronização no backend, em vez de depender apenas de uma referência local do React.

### 3. Recuperar as comissões ausentes

- Reprocessar as apólices elegíveis que não possuem cronograma, incluindo as 5 cadastradas em 19/08.
- Usar os dados já gravados em cada apólice e a configuração vigente da seguradora, sem duplicar cronogramas existentes.
- Produzir uma conferência final por apólice: quantidade de parcelas, primeira data, última data e valor total.

### 4. Padronizar mês e ordem cronológica

- Manter a regra comercial atual do **esgotamento em D+30**, mas deixar explícito na interface que o mês apresentado é o **mês de vencimento da comissão**.
- Ordenar todas as listas de comissões por: data de referência crescente, apólice e número da parcela.
- Usar a data de referência adequada ao contexto:
  - prevista/pendente: vencimento;
  - paga: recebimento;
  - devolvida: estorno;
  - cancelada: vencimento.
- Mostrar a origem da data na tabela para evitar que “cadastro em agosto” seja confundido com “receita prevista em agosto”.

### 5. Validar o fluxo completo

- Testar apólices Auto em esgotamento e parcelado, Saúde em agenciamento/recorrência e Consórcio.
- Cobrir recarga da página, duas gerações concorrentes, falha parcial e ordenação entre meses.
- Conferir no banco que cada cronograma permanece após sair e voltar à página e que não existem competências duplicadas.

## Resultado esperado

- As apólices permanecem visíveis após recarregar.
- Suas comissões também permanecem e aparecem no mês correspondente à regra comercial.
- Nenhuma recorrência é duplicada.
- As tabelas seguem uma ordem cronológica previsível e informam qual data determina o mês exibido.