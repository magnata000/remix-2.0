## Objetivo
Remover as abas "Nova cotação" / "Histórico" do Multicálculo. O Histórico passa a ser a tela padrão; "Nova cotação" vira um botão com ícone de calculadora + sinal de mais, posicionado imediatamente à direita do botão "Comparar". Ao clicar abre o wizard em um modal centralizado. Editar/recalcular versão também usa o modal.

## Mudanças

**`src/components/multicalc/QuoteHistory.tsx`**
- Adicionar prop `onNewQuote: () => void`.
- Renderizar novo `<Button>` logo após o botão "Comparar" (linhas 129–136), com `<Calculator />` sobreposto por um `<Plus />` pequeno no canto superior esquerdo (ou agrupados via `<span>` com `Calculator` + `Plus` absoluto). Texto "Nova cotação" ao lado, mesmo estilo do botão Comparar (variant primário com `bg-brand`).
- Importar `Calculator` e `Plus` de `lucide-react`.

**`src/components/modules/MulticalcModule.tsx`**
- Remover `Tabs/TabsList/TabsTrigger/TabsContent`.
- Estado `view: "historico" | "comparar"` + estado `wizardOpen: boolean`.
- Renderizar `QuoteHistory` quando `view === "historico"` e `QuoteCompare` quando `"comparar"`.
- Renderizar `<Dialog open={wizardOpen} onOpenChange={...}>` com `<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">` contendo `MulticalcWizard` (com `key`, `initialData`, `editingLabel`, `onComplete`).
- `handleEditVersion` e `handleRecalculate` → `setEditing(...); setWizardOpen(true)` (sem mudar tab).
- `handleComplete` fecha o modal (`setWizardOpen(false)`) e limpa `editing`.
- Passar `onNewQuote={() => { setEditing(null); setWizardOpen(true); }}` para `QuoteHistory`.
- Se `initialFocus.quoteGroupId` → manter `view = "historico"` (default).

## Fora de escopo
- Estilo interno do `MulticalcWizard`, lógica de cotação, comparar, status.
- Outras abas/seções.
