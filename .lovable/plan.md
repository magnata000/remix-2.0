Remover a flag de imposto (Comissão líquida + taxa) do formulário de Nova Apólice.

Mudanças em `src/components/portfolio/NewPolicyDialog.tsx`:
1. Remover o import de `PolicyTaxOverrideFields`.
2. Remover os estados `comissaoLiquida` e `taxaImposto`.
3. No `useEffect` de abertura do dialog, remover o reset desses dois estados.
4. No `submit`, remover `comissaoLiquida` e `taxaImposto` do payload enviado a `addPolicy`.
5. No JSX, remover o bloco `<PolicyTaxOverrideFields ... />`.

Nenhuma alteração em `EditPolicyDialog`, `RenewPolicyDialog`, `PolicyTaxOverrideFields`, stores ou engine. Apenas o formulário de Nova Apólice deixa de oferecer o override por apólice; novas apólices sempre herdarão o padrão da seguradora.

Outros arquivos não serão modificados.