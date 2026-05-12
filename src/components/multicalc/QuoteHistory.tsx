import { useMemo, useState } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ChevronDown, ChevronRight, Pencil, GitCompareArrows, Trophy, FileCheck2, Search, X,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDate } from "@/lib/mock/data";
import { useQuoteStore, QuoteRecord, QuoteStatus, LostReason, computeDiff, effectiveStatus } from "@/lib/multicalc/quoteStore";
import { StatusBadge } from "./StatusBadge";

type Props = {
  selected: string[]; // quote ids
  onToggleSelect: (id: string) => void;
  onCompare: () => void;
  onEditVersion: (rec: QuoteRecord) => void;
  onClearSelection?: () => void;
  allowedBranch?: string | null;
  mixedBranches?: boolean;
};

export function QuoteHistory({ selected, onToggleSelect, onCompare, onEditVersion, onClearSelection, allowedBranch, mixedBranches }: Props) {
  const { groups, setStatus } = useQuoteStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [branchFilter, setBranchFilter] = useState<string>("todos");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [lostDialog, setLostDialog] = useState<{ groupId: string } | null>(null);
  const [lostReason, setLostReason] = useState<LostReason>("preco");

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
  };

  const confirmLost = () => {
    if (lostDialog) {
      setStatus(lostDialog.groupId, "perdida", lostReason);
      toast.success("Cotação marcada como Perdida");
      setLostDialog(null);
    }
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
          return (
            <Card key={g.groupId} className="rounded-2xl border-border shadow-none overflow-hidden">
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
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Última atualização em {formatDate(g.latest.createdAt)} · melhor preço {formatBRL(winnerPrice)}
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
                                  {formatDate(v.createdAt)} · por {v.createdBy}
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
                            <div className="flex gap-2 md:shrink-0">
                              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => onEditVersion(v)}>
                                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar (nova versão)
                              </Button>
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

      <Dialog open={!!lostDialog} onOpenChange={(o) => !o && setLostDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar como perdida</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Motivo</Label>
            <Select value={lostReason} onValueChange={(v) => setLostReason(v as LostReason)}>
              <SelectTrigger className="rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="preco">Preço</SelectItem>
                <SelectItem value="cobertura">Cobertura</SelectItem>
                <SelectItem value="prazo">Prazo</SelectItem>
                <SelectItem value="sem-retorno">Sem retorno</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setLostDialog(null)}>Cancelar</Button>
            <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={confirmLost}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
