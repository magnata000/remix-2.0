
# Destravar a atualização da aba Financeiro

## Diagnóstico

- Os arquivos novos existem e estão corretos:
  - `src/components/modules/FinancialModule.tsx` agora é um shell com `<Tabs>` (Caixa | Relatório).
  - `src/components/financial/CaixaTab.tsx`, `ReportTab.tsx`, `NewExpenseSheet.tsx`, `NewIncomeDialog.tsx`, `RegisterEntryDialog.tsx`, `MovementDetailsSheet.tsx` foram criados.
  - `src/lib/cash/cashStore.tsx` criado e `CashProvider` envolvendo o app em `src/routes/index.tsx`.
- Logs do Vite (`/tmp/sandbox-state.db`) não mostram nenhum erro de transform/parse.
- Os console logs do preview citam bundles antigos (`index-BzH0JRgI.js`, `main-DrBCm6LM.js`), o que indica que o iframe está servindo módulos antigos do gate HMR — o usuário não viu as novas abas porque o módulo `FinancialModule` não foi re-transformado no preview.

## Plano (executar em build mode)

1. Flush do gate HMR para forçar re-transform e reload do preview:
   - `curl -sf -X POST http://localhost:8080/__hmr_flush`
2. Abrir o preview em `view_preview`, navegar até a aba **Financeiro** (já é o módulo `financial` no `TopBar`) e tirar 1 screenshot para confirmar visualmente:
   - TabsList com "Caixa" e "Relatório" visíveis.
   - Em "Caixa": 4 KPIs + 3 cards de Resumo do mês + seção "Despesas cadastradas" com botão "Nova despesa" + tabela de Movimentações com Select de mês e botão "Nova entrada" + tabela de Comissões.
   - Em "Relatório": LineChart "Fluxo de Caixa Mensal", "Receita vs Comissões", PieChart "Saídas por Categoria" e BarChart "Top por Receita".
3. Caso o screenshot mostre qualquer divergência (componente não rendeu, erro em runtime), inspecionar `code--read_runtime_errors` e ajustar o ponto exato — sem reescrita.

Nenhuma mudança de código planejada nesta etapa; apenas destravar o preview e validar. Se a validação revelar bug real, abro um novo plano específico.
