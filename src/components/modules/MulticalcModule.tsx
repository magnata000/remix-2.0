import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MulticalcWizard } from "@/components/multicalc/MulticalcWizard";
import { QuoteHistory } from "@/components/multicalc/QuoteHistory";
import { QuoteCompare } from "@/components/multicalc/QuoteCompare";
import { useQuoteStore, QuoteRecord, QuoteFormData } from "@/lib/multicalc/quoteStore";
import { usePipelineStore } from "@/lib/pipeline/opportunityStore";
import { useNavigation } from "@/lib/navigation";
import { toast } from "sonner";

export function MulticalcModule() {
  const { addNewQuote, addVersion, records, groups } = useQuoteStore();
  const { byQuoteGroup, moveStage, setEstimatedValue } = usePipelineStore();
  const { consumeFocus, goTo } = useNavigation();
  const [tab, setTab] = useState<"nova" | "historico" | "comparar">("nova");
  const [selected, setSelected] = useState<string[]>([]);
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
  const selectedBranches = new Set(
    selected.map((id) => records.find((r) => r.id === id)?.branch).filter(Boolean) as string[]
  );
  const mixedBranches = selectedBranches.size > 1;
  const [editing, setEditing] = useState<{ groupId: string; version: number; clientName: string; data: QuoteFormData } | null>(null);

  // Consume nav focus on mount
  useEffect(() => {
    const f = consumeFocus();
    if (f.quoteGroupId) {
      setTab("historico");
      setFocusedGroupId(f.quoteGroupId);
    }
  }, [consumeFocus]);

  const handleEditVersion = (rec: QuoteRecord) => {
    setEditing({ groupId: rec.groupId, version: rec.version, clientName: rec.clientName, data: rec.formData });
    setTab("nova");
  };

  const handleComplete = (payload: { formData: QuoteFormData; results: QuoteRecord["results"]; winner: QuoteRecord["winnerInsurer"] }) => {
    if (editing) {
      const rec = addVersion(editing.groupId, payload.formData, payload.results, payload.winner);
      toast.success(`Nova versão v${rec.version} salva no histórico`);
      setEditing(null);
    } else {
      const rec = addNewQuote(payload.formData, payload.results, payload.winner);
      toast.success(`Cotação v${rec.version} salva no histórico de ${rec.clientName}`);
    }
    setTab("historico");
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
    setTab("comparar");
  };

  // Sync pipeline when quote status changes (ganha/perdida)
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="h-10 w-full md:w-auto">
          <TabsTrigger value="nova" className="flex-1 md:flex-none">
            {editing ? `Editando v${editing.version}` : "Nova cotação"}
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex-1 md:flex-none">Histórico</TabsTrigger>
          <TabsTrigger value="comparar" className="flex-1 md:flex-none" disabled={selected.length < 2 || mixedBranches}>
            Comparar {selected.length > 0 && `(${selected.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nova" className="mt-4">
          <MulticalcWizard
            key={editing?.groupId ?? "new"}
            initialData={editing?.data}
            editingLabel={editing ? `Editando v${editing.version} de ${editing.clientName}` : undefined}
            onComplete={handleComplete}
          />
          {editing && (
            <button
              className="mt-3 text-xs text-muted-foreground underline"
              onClick={() => setEditing(null)}
            >
              Cancelar edição e iniciar nova cotação
            </button>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <QuoteHistory
            selected={selected}
            onToggleSelect={toggleSelect}
            onCompare={goCompare}
            onEditVersion={handleEditVersion}
            onClearSelection={clearSelection}
            onStatusChanged={onStatusChanged}
            onOpenPipeline={(opportunityId) => goTo("kanban", { opportunityId })}
            allowedBranch={selectedBranches.size === 1 ? Array.from(selectedBranches)[0] : null}
            mixedBranches={mixedBranches}
            focusedGroupId={focusedGroupId}
            onClearFocus={() => setFocusedGroupId(null)}
          />
        </TabsContent>

        <TabsContent value="comparar" className="mt-4">
          <QuoteCompare selectedIds={selected} onBack={() => setTab("historico")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
