import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MulticalcWizard } from "@/components/multicalc/MulticalcWizard";
import { QuoteHistory } from "@/components/multicalc/QuoteHistory";
import { QuoteCompare } from "@/components/multicalc/QuoteCompare";
import { useQuoteStore, QuoteRecord, QuoteFormData, generateResults } from "@/lib/multicalc/quoteStore";
import { usePipelineStore } from "@/lib/pipeline/opportunityStore";
import { useNavigation } from "@/lib/navigation";
import { toast } from "sonner";

export function MulticalcModule() {
  const { addNewQuote, addVersion, records, groups } = useQuoteStore();
  const { byQuoteGroup, moveStage, setEstimatedValue } = usePipelineStore();
  const { consumeFocus, goTo } = useNavigation();
  const initialFocus = useMemo(() => consumeFocus(), [consumeFocus]);
  const [view, setView] = useState<"historico" | "comparar">("historico");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(initialFocus.quoteGroupId ?? null);
  const selectedBranches = new Set(
    selected.map((id) => records.find((r) => r.id === id)?.branch).filter(Boolean) as string[]
  );
  const mixedBranches = selectedBranches.size > 1;
  const [editing, setEditing] = useState<{ groupId: string; version: number; clientName: string; data: QuoteFormData } | null>(null);

  const openNewQuote = () => {
    setEditing(null);
    setWizardOpen(true);
  };

  const handleEditVersion = (rec: QuoteRecord) => {
    setEditing({ groupId: rec.groupId, version: rec.version, clientName: rec.clientName, data: rec.formData });
    setWizardOpen(true);
  };

  const handleRecalculate = (rec: QuoteRecord) => {
    const results = generateResults(rec.formData);
    const cheapest = results.reduce((a, b) => (b.price < a.price ? b : a));
    const newRec = addVersion(rec.groupId, rec.formData, results, cheapest.insurer);
    setFocusedGroupId(rec.groupId);
    setView("historico");
    toast.success(`Cotação recalculada — nova versão v${newRec.version} salva`);
  };

  const handleComplete = (payload: { formData: QuoteFormData; results: QuoteRecord["results"]; winner: QuoteRecord["winnerInsurer"] }) => {
    if (editing) {
      const rec = addVersion(editing.groupId, payload.formData, payload.results, payload.winner);
      toast.success(`Nova versão v${rec.version} salva no histórico`);
    } else {
      const rec = addNewQuote(payload.formData, payload.results, payload.winner);
      toast.success(`Cotação v${rec.version} salva no histórico de ${rec.clientName}`);
    }
    setEditing(null);
    setWizardOpen(false);
    setView("historico");
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const clearSelection = () => setSelected([]);

  const goCompare = () => {
    if (selected.length < 2) {
      toast.error("Selecione pelo menos 2 versões para comparar");
      return;
    }
    if (mixedBranches) {
      toast.error("Não é possível comparar cotações de ramos diferentes");
      return;
    }
    setView("comparar");
  };

  const onStatusChanged = (groupId: string, status: "ganha" | "perdida", lostReason?: import("@/lib/multicalc/quoteStore").LostReason) => {
    const opp = byQuoteGroup(groupId);
    if (!opp) return;
    if (status === "ganha") {
      const grp = groups.find((g) => g.groupId === groupId);
      const winnerPrice = grp ? Math.min(...grp.latest.results.map((r) => r.price)) : opp.estimatedValue;
      moveStage(opp.id, "fechado");
      setEstimatedValue(opp.id, winnerPrice);
      toast.success(`Pipeline atualizado: ${opp.clientName} → Fechado`);
    } else {
      moveStage(opp.id, "perdido", lostReason);
      toast.success(`Pipeline atualizado: ${opp.clientName} → Perdido`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Multicálculo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare ofertas, salve no histórico e versione cada cotação
          </p>
        </div>
      </div>

      {view === "historico" ? (
        <QuoteHistory
          selected={selected}
          onToggleSelect={toggleSelect}
          onCompare={goCompare}
          onNewQuote={openNewQuote}
          onEditVersion={handleEditVersion}
          onRecalculate={handleRecalculate}
          onClearSelection={clearSelection}
          onStatusChanged={onStatusChanged}
          onOpenPipeline={(opportunityId) => goTo("kanban", { opportunityId })}
          allowedBranch={selectedBranches.size === 1 ? Array.from(selectedBranches)[0] : null}
          mixedBranches={mixedBranches}
          focusedGroupId={focusedGroupId}
          onClearFocus={() => setFocusedGroupId(null)}
        />
      ) : (
        <QuoteCompare selectedIds={selected} onBack={() => setView("historico")} />
      )}

      <Dialog
        open={wizardOpen}
        onOpenChange={(v) => {
          setWizardOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Editando v${editing.version} — ${editing.clientName}` : "Nova cotação"}
            </DialogTitle>
          </DialogHeader>
          <MulticalcWizard
            key={editing?.groupId ?? "new"}
            initialData={editing?.data}
            editingLabel={editing ? `Editando v${editing.version} de ${editing.clientName}` : undefined}
            onComplete={handleComplete}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
