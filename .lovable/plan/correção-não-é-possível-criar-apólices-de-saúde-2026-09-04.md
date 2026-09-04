# Correção: não é possível criar apólices de Saúde

## O que está acontecendo

O formulário de nova apólice preenche automaticamente o campo "Aniversário do plano" no formato dia/mês (ex.: `04/09`). O banco, porém, guarda esse campo como uma data completa (dia/mês/ano). Com isso, toda tentativa de salvar uma apólice do ramo Saúde é recusada no momento da gravação.

Como o botão "Criar apólice" não trata falhas, o erro é silencioso: nada acontece, nenhuma mensagem aparece e o formulário fica aberto. Confirmado no banco: nenhuma apólice de Saúde foi criada pelo aplicativo até hoje — todas as existentes vieram da importação inicial. Ramos como Auto e Consórcio funcionam porque não usam esse campo.

## Correção

1. Converter o aniversário do plano para data completa ao salvar, usando o ano do início de vigência (ex.: `04/09` + início em 2026 → 04/09/2026). Aplicar tanto ao criar quanto ao editar apólice.
2. Ao abrir uma apólice existente para edição, mostrar o campo de volta como dia/mês, mantendo a experiência atual.
3. Exibir mensagem de erro real quando qualquer gravação falhar (criar apólice, renovar, gerar comissões), em vez de o botão não responder. Assim, problemas futuros ficam visíveis em segundos.
4. Validar os beneficiários antes de enviar: nome e data de nascimento obrigatórios, evitando outra recusa silenciosa na gravação.

## Verificação

- Criar uma apólice de Saúde de teste pelo aplicativo (com e sem beneficiários), confirmar que ela aparece na lista com as comissões geradas, e remover o registro de teste ao final.
- Criar uma apólice de Auto para garantir que nada regrediu.
- Rodar a suíte de testes e o build.

## Detalhes técnicos

- `src/components/portfolio/NewPolicyDialog.tsx` e `EditPolicyDialog.tsx`: helper `annivToISO(ddmm, startDate)` / `isoToDdmm(iso)` (arquivo utilitário compartilhado em `src/lib/portfolio/`), aplicado no payload e no carregamento do estado.
- `submit` passa a usar `try/catch` com `toast.error(msg)` e só fecha o diálogo em caso de sucesso; erros de `bulkCreateCommissions` também surfaceados.
- Nenhuma alteração de schema ou RLS é necessária — `policies.health_anniversary` continua `date`, consumido por `workflowEngine` como ISO.
