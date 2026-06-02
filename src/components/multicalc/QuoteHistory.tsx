import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown, ChevronRight, Pencil, GitCompareArrows, Trophy, FileCheck2, Search, X, Link2, Plus, RefreshCw, Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateShort } from "@/lib/mock/data";
import { useQuoteStore, QuoteRecord, QuoteStatus, LostReason, computeDiff, effectiveStatus } from "@/lib/multicalc/quoteStore";
import { usePipelineStore, stageLabels } from "@/lib/pipeline/opportunityStore";
import { StatusBadge } from "./StatusBadge";
import { LostReasonDialog } from "@/components/shared/LostReasonDialog";

type Props = {
  selected: string[]; // quote ids
  onToggleSelect: (id: string) => void;
  onCompare: () => void;
  onNewQuote: () => void;
  onEditVersion: (rec: QuoteRecord) => void;
  onRecalculate?: (rec: QuoteRecord) => void;
  onClearSelection?: () => void;
  onStatusChanged?: (groupId: string, status: "ganha" | "perdida", lostReason?: LostReason) => void;
  onOpenPipeline?: (opportunityId: string) => void;
  allowedBranch?: string | null;
  mixedBranches?: boolean;
  focusedGroupId?: string | null;
  onClearFocus?: () => void;
};

export function QuoteHistory({ selected, onToggleSelect, onCompare, onEditVersion, onRecalculate, onClearSelection, onStatusChanged, onOpenPipeline, allowedBranch, mixedBranches, focusedGroupId, onClearFocus }: Props) {
  const { groups, setStatus } = useQuoteStore();
  const { byQuoteGroup, createFromQuote } = usePipelineStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [branchFilter, setBranchFilter] = useState<string>("todos");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [lostDialog, setLostDialog] = useState<{ groupId: string } | null>(null);

  // Auto-expand + scroll to focused group from cross-module navigation
  useEffect(() => {
    if (focusedGroupId) {
      setOpenGroups((s) => ({ ...s, [focusedGroupId]: true }));
      const t = setTimeout(() => {
        document.getElementById(`quote-group-${focusedGroupId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        onClearFocus?.();
      }, 80);
      return () => clearTimeout(t);
    }
  }, [focusedGroupId, onClearFocus]);

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      if (search && !g.clientName.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "todos" && g.status !== statusFilter) return false;
      if (branchFilter !== "todos" && g.branch !== branchFilter) return false;
      return true;
    });
  }, [groups, search, statusFilter, branchFilter]);

  const handleStatus = (groupId: string, status: QuoteStatus) => {
    if (status === "perdida") {
      setLostDialog({ groupId });
      return;
    }
    setStatus(groupId, status);
    toast.success(status === "ganha" ? "Cotação marcada como Ganha" : "Status atualizado");
    if (status === "ganha") onStatusChanged?.(groupId, "ganha");
  };

  const confirmLost = (reason: LostReason, note?: string) => {
    if (lostDialog) {
      setStatus(lostDialog.groupId, "perdida", reason, note);
      toast.success("Cotação marcada como Perdida");
      onStatusChanged?.(lostDialog.groupId, "perdida", reason);
      setLostDialog(null);
    }
  };

  const handleAddToPipeline = (g: typeof groups[number]) => {
    const winnerPrice = Math.min(...g.latest.results.map((r) => r.price));
    createFromQuote({
      clientName: g.clientName,
      branch: g.branch,
      estimatedValue: winnerPrice,
      quoteGroupId: g.groupId,
    });
    toast.success(`${g.clientName} adicionado ao pipeline em "Cotação"`);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-3 rounded-2xl border-border shadow-none">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl bg-muted border-0"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="md:w-44 rounded-xl bg-muted border-0"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="aberto">Em aberto</SelectItem>
              <SelectItem value="ganha">Ganha</SelectItem>
              <SelectItem value="perdida">Perdida</SelectItem>
              <SelectItem value="expirada">Expirada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="md:w-44 rounded-xl bg-muted border-0"><SelectValue placeholder="Ramo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os ramos</SelectItem>
              {["Auto", "Vida", "Residencial", "Empresarial", "Saúde"].map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={onCompare}
            disabled={selected.length < 2 || !!mixedBranches}
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <GitCompareArrows className="h-4 w-4 mr-2" />
            Comparar ({selected.length})
          </Button>
        </div>
        {selected.length > 0 && onClearSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            title="Limpar todas as seleções"
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-3 w-3" />
            Limpar seleção ({selected.length})
          </button>
        )}
        {mixedBranches && (
          <p className="text-xs text-destructive mt-2">
            Não é possível comparar cotações de ramos diferentes. Selecione versões do mesmo ramo.
          </p>
        )}
      </Card>

      {filtered.length === 0 && (
        <Card className="p-10 rounded-2xl border-border shadow-none text-center text-sm text-muted-foreground">
          Nenhuma cotação encontrada com os filtros atuais.
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((g) => {
          const isOpen = openGroups[g.groupId] ?? false;
          const winnerPrice = Math.min(...g.latest.results.map((r) => r.price));
          const linkedOpp = byQuoteGroup(g.groupId);
          return (
            <Card id={`quote-group-${g.groupId}`} key={g.groupId} className="rounded-2xl border-border shadow-none overflow-hidden scroll-mt-20">
              <Collapsible open={isOpen} onOpenChange={(o) => setOpenGroups((s) => ({ ...s, [g.groupId]: o }))}>
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center gap-3 hover:bg-muted/40 transition text-left">
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold truncate">{g.clientName}</span>
                        <Badge variant="outline" className="bg-muted border-0">{g.branch}</Badge>
                        <Badge variant="outline" className="bg-muted border-0">{g.versions.length} {g.versions.length === 1 ? "versão" : "versões"}</Badge>
                        <StatusBadge status={g.status} />
                        {linkedOpp ? (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); onOpenPipeline?.(linkedOpp.id); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onOpenPipeline?.(linkedOpp.id); } }}
                            title="Abrir no Pipeline de Vendas"
                            className="inline-flex items-center gap-1 text-[11px] bg-brand/15 text-brand-foreground px-2 py-0.5 rounded-md hover:bg-brand/25 transition cursor-pointer"
                          >
                            <Link2 className="h-3 w-3" />
                            No pipeline · {stageLabels[linkedOpp.stage]}
                          </span>
                        ) : (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); handleAddToPipeline(g); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleAddToPipeline(g); } }}
                            title="Criar oportunidade no pipeline"
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md hover:bg-muted transition cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar ao pipeline
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Última atualização em {formatDateShort(g.latest.createdAt)} · melhor preço {formatBRL(winnerPrice)}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {g.status !== "ganha" && (
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleStatus(g.groupId, "ganha")}>
                          <FileCheck2 className="h-3.5 w-3.5 mr-1" /> Ganha
                        </Button>
                      )}
                      {g.status !== "perdida" && (
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleStatus(g.groupId, "perdida")}>
                          Perdida
                        </Button>
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 border-t border-border">
                    <ol className="mt-3 space-y-2">
                      {g.versions.map((v, idx) => {
                        const prev = idx > 0 ? g.versions[idx - 1] : null;
                        const diffs = prev ? computeDiff(prev.formData, v.formData) : [];
                        const versionWinner = v.results.find((r) => r.insurer === v.winnerInsurer);
                        const isSelected = selected.includes(v.id);
                        const branchBlocked = !isSelected && !!allowedBranch && allowedBranch !== v.branch;
                        const eff = effectiveStatus(v, g.versions);
                        return (
                          <li key={v.id} className="rounded-xl bg-muted/40 p-3 flex flex-col md:flex-row md:items-center gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Checkbox
                                checked={isSelected}
                                disabled={branchBlocked}
                                onCheckedChange={() => onToggleSelect(v.id)}
                                className="mt-1"
                                title={branchBlocked ? "Só é possível comparar cotações do mesmo ramo" : undefined}
                              />
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/30 text-xs font-bold">
                                v{v.version}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-sm">{v.winnerInsurer}</span>
                                  <Badge className="bg-brand text-brand-foreground border-0 gap-1"><Trophy className="h-3 w-3" />{formatBRL(versionWinner?.price ?? 0)}</Badge>
                                  {idx === g.versions.length - 1 && eff !== g.status && <StatusBadge status={eff} />}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatDateShort(v.createdAt)} · por {v.createdBy}
                                </p>
                                {diffs.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {diffs.map((d) => (
                                      <span key={d.field} className="inline-flex items-center gap-1 text-[11px] bg-warning/15 text-warning-foreground px-2 py-0.5 rounded-md">
                                        {d.label}: <s className="opacity-60">{d.from || "—"}</s> → <strong>{d.to || "—"}</strong>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {idx === 0 && <p className="text-[11px] text-muted-foreground mt-1 italic">Versão inicial</p>}
                              </div>
                            </div>
                            <div className="flex gap-2 md:shrink-0 items-center">
                              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => onEditVersion(v)}>
                                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar (nova versão)
                              </Button>
                              {g.status === "expirada" && onRecalculate && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg"
                                  onClick={() => onRecalculate(v)}
                                  title="Refazer cotação com os mesmos dados"
                                >
                                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recalcular
                                </Button>
                              )}
                              {isSelected && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  title="Remover desta comparação"
                                  onClick={() => onToggleSelect(v.id)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                    <div className="md:hidden mt-3 flex gap-2">
                      {g.status !== "ganha" && (
                        <Button size="sm" variant="outline" className="rounded-lg flex-1" onClick={() => handleStatus(g.groupId, "ganha")}>
                          Marcar Ganha
                        </Button>
                      )}
                      {g.status !== "perdida" && (
                        <Button size="sm" variant="outline" className="rounded-lg flex-1" onClick={() => handleStatus(g.groupId, "perdida")}>
                          Marcar Perdida
                        </Button>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      <LostReasonDialog
        open={!!lostDialog}
        onOpenChange={(o) => !o && setLostDialog(null)}
        onConfirm={confirmLost}
      />
    </div>
  );
}
