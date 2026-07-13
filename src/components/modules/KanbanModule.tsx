import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, GripVertical, Calendar, Trophy, Calculator, Link2, Pencil, Trash2, BarChart3 } from "lucide-react";
import { formatBRL, formatDateShort, lostReasonLabel, type KanbanStage, type LostReason } from "@/lib/mock/data";
import { usePipelineStore, type Opportunity } from "@/lib/pipeline/opportunityStore";
import { useQuoteStore } from "@/lib/multicalc/quoteStore";
import { useNavigation } from "@/lib/navigation";
import { FEATURES } from "@/lib/featureFlags";
import { TasksBoard } from "@/components/tasks/TasksBoard";
import { NewOpportunityDialog } from "@/components/pipeline/NewOpportunityDialog";
import { CloseOpportunityDialog } from "@/components/pipeline/CloseOpportunityDialog";
import { OpportunityDetailDialog } from "@/components/pipeline/OpportunityDetailDialog";
import { EditOpportunityDialog } from "@/components/pipeline/EditOpportunityDialog";
import { PipelineAnalytics } from "@/components/pipeline/PipelineAnalytics";
import { LostReasonDialog } from "@/components/shared/LostReasonDialog";
import { SlaBadge } from "@/components/shared/SlaBadge";
import { useSlaTicker } from "@/hooks/useSlaTicker";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const stages: { key: KanbanStage; label: string; color: string }[] = [
  { key: "lead", label: "Lead", color: "bg-info/15 text-info" },
  { key: "cotacao", label: "Cotação", color: "bg-warning/15 text-warning" },
  { key: "negociacao", label: "Negociação", color: "bg-brand/30 text-brand-foreground" },
  { key: "fechado", label: "Fechado", color: "bg-success/15 text-success" },
  { key: "perdido", label: "Perdido", color: "bg-destructive/15 text-destructive" },
];

export function KanbanModule() {
  useSlaTicker();
  const { opportunities, moveStage, setEstimatedValue, deleteOpportunity } = usePipelineStore();
  const { groups } = useQuoteStore();
  const { goTo, consumeFocus } = useNavigation();
  const [dragId, setDragId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [pendingLost, setPendingLost] = useState<{ id: string } | null>(null);
  const [pendingClose, setPendingClose] = useState<{ id: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Opportunity | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "analytics">("board");
  const initialFocus = useMemo(() => consumeFocus(), [consumeFocus]);
  const [highlightId] = useState<string | null>(initialFocus.opportunityId ?? null);

  const move = (id: string, stage: KanbanStage) => {
    if (stage === "perdido") { setPendingLost({ id }); return; }
    if (stage === "fechado") { setPendingClose({ id }); return; }
    moveStage(id, stage);
  };

  const confirmLost = (reason: LostReason, note?: string) => {
    if (!pendingLost) return;
    moveStage(pendingLost.id, "perdido", reason, note);
    toast.success("Oportunidade marcada como Perdida");
    setPendingLost(null);
  };

  const confirmClose = (closedValue: number) => {
    if (!pendingClose) return;
    setEstimatedValue(pendingClose.id, closedValue);
    moveStage(pendingClose.id, "fechado");
    toast.success("Oportunidade fechada");
    setPendingClose(null);
  };

  const closingOpportunity = pendingClose ? opportunities.find((o) => o.id === pendingClose.id) ?? null : null;
  const byStage = (s: KanbanStage) => opportunities.filter((t) => t.stage === s);
  const groupFor = (quoteGroupId?: string) => quoteGroupId ? groups.find((g) => g.groupId === quoteGroupId) : undefined;
  const openQuote = (quoteGroupId?: string) => { if (quoteGroupId) goTo("multicalc", { quoteGroupId }); else goTo("multicalc"); };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quadro</h1>
        <p className="text-sm text-muted-foreground mt-1">Pipeline de vendas e tarefas internas da corretora</p>
      </div>

      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="h-10">
          <TabsTrigger value="pipeline">Pipeline de Vendas</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-5 space-y-5">
          {view === "analytics" ? (
            <PipelineAnalytics onBack={() => setView("board")} />
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Arraste para mover • {opportunities.length} oportunidades{FEATURES.multicalc ? " · vinculadas ao Multicálculo" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setView("analytics")}>
                    <BarChart3 className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Estatísticas</span>
                  </Button>
                  <Button onClick={() => setOpenNew(true)} className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
                    <Plus className="h-4 w-4 mr-2" /> Nova oportunidade
                  </Button>
                </div>
              </div>
              <NewOpportunityDialog open={openNew} onOpenChange={setOpenNew} />

              {/* Desktop kanban */}
              <div className="hidden md:grid grid-cols-5 gap-4">
                {stages.map((s) => (
                  <div
                    key={s.key}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragId) { move(dragId, s.key); setDragId(null); } }}
                    className="bg-muted/40 rounded-2xl p-3 min-h-[400px]"
                  >
                    <div className="flex items-center justify-between px-1 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{s.label}</span>
                        <Badge className={`${s.color} border-0`}>{byStage(s.key).length}</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {byStage(s.key).map((t) => (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={() => setDragId(t.id)}
                          onClick={() => setDetailId(t.id)}
                          className={`group relative bg-card border rounded-xl p-3 cursor-pointer active:cursor-grabbing hover:border-brand transition ${
                            highlightId === t.id ? "border-brand ring-2 ring-brand/30" : "border-border"
                          }`}
                        >
                          <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              type="button"
                              aria-label="Editar"
                              onClick={(e) => { e.stopPropagation(); setEditingId(t.id); }}
                              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Excluir"
                              onClick={(e) => { e.stopPropagation(); setPendingDelete(t); }}
                              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <KanbanCardBody
                            task={t}
                            quoteSummary={groupFor(t.quoteGroupId)}
                            onOpenQuote={() => openQuote(t.quoteGroupId)}
                          />
                        </div>
                      ))}
                      {byStage(s.key).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8">Sem cards</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile: tabs */}
              <Tabs defaultValue="lead" className="md:hidden">
                <TabsList className="grid grid-cols-5 w-full bg-muted rounded-xl">
                  {stages.map((s) => (
                    <TabsTrigger key={s.key} value={s.key} className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-[11px]">
                      {s.label}
                      <span className="ml-1 text-muted-foreground">({byStage(s.key).length})</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {stages.map((s) => (
                  <TabsContent key={s.key} value={s.key} className="space-y-2 mt-3">
                    {byStage(s.key).length === 0 ? (
                      <Card className="p-8 rounded-2xl border-border shadow-none text-center">
                        <p className="text-sm text-muted-foreground">Sem cards nesta etapa</p>
                      </Card>
                    ) : (
                      byStage(s.key).map((t) => (
                        <div key={t.id} onClick={() => setDetailId(t.id)} className="bg-card border border-border rounded-xl p-3 cursor-pointer">
                          <KanbanCardBody
                            task={t}
                            quoteSummary={groupFor(t.quoteGroupId)}
                            onOpenQuote={() => openQuote(t.quoteGroupId)}
                          />
                        </div>
                      ))
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}
        </TabsContent>

        <TabsContent value="tarefas" className="mt-5">
          <TasksBoard />
        </TabsContent>
      </Tabs>

      <LostReasonDialog
        open={!!pendingLost}
        onOpenChange={(o) => !o && setPendingLost(null)}
        title="Mover para Perdido"
        onConfirm={confirmLost}
      />

      <CloseOpportunityDialog
        open={!!pendingClose}
        onOpenChange={(o) => !o && setPendingClose(null)}
        opportunity={closingOpportunity}
        onConfirm={confirmClose}
      />

      <OpportunityDetailDialog
        opportunity={detailId ? opportunities.find((o) => o.id === detailId) ?? null : null}
        onOpenChange={(o) => !o && setDetailId(null)}
        onOpenQuote={(gid) => { setDetailId(null); openQuote(gid); }}
        onDelete={(o) => { setDetailId(null); setPendingDelete(o); }}
      />

      <EditOpportunityDialog
        opportunity={editingId ? opportunities.find((o) => o.id === editingId) ?? null : null}
        onOpenChange={(o) => !o && setEditingId(null)}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir oportunidade?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? `"${pendingDelete.title}" será removida. Esta ação não pode ser desfeita.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) {
                  deleteOpportunity(pendingDelete.id);
                  toast.success("Oportunidade excluída");
                  setPendingDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type GroupSummary = ReturnType<typeof useQuoteStore>["groups"][number];

function KanbanCardBody({
  task, quoteSummary, onOpenQuote,
}: {
  task: Opportunity;
  quoteSummary?: GroupSummary;
  onOpenQuote: () => void;
}) {
  const terminal = task.stage === "fechado" || task.stage === "perdido";
  return (
    <>
      <div className="flex items-start gap-2 pr-14">
        <GripVertical className="h-4 w-4 text-muted-foreground hidden md:block mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{task.title}</p>
          <p className="text-xs text-muted-foreground truncate">{task.clientName}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Badge variant="outline" className="rounded-full text-xs">{task.branch}</Badge>
        <p className="text-sm font-bold">{task.estimatedValue > 0 ? formatBRL(task.estimatedValue) : "—"}</p>
      </div>

      {!terminal && task.slaDueAt && (
        <div className="mt-2">
          <SlaBadge slaDueAt={task.slaDueAt} slaHours={task.slaHours} paused={!!task.slaPausedAt} compact />
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onOpenQuote(); }}
        className="mt-2 w-full text-left text-[11px] flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted hover:bg-muted/70 transition text-muted-foreground hover:text-foreground"
        title={task.quoteGroupId ? "Abrir no Multicálculo" : "Cotar no Multicálculo"}
      >
        {task.quoteGroupId && quoteSummary ? (
          <>
            <Link2 className="h-3 w-3 shrink-0 text-brand" />
            <span className="truncate">
              {quoteSummary.versions.length} {quoteSummary.versions.length === 1 ? "cotação" : "cotações"}
            </span>
            <Trophy className="h-3 w-3 shrink-0 ml-auto" />
            <span className="font-medium text-foreground">v{quoteSummary.latest.version}</span>
          </>
        ) : (
          <>
            <Calculator className="h-3 w-3 shrink-0" />
            <span>Cotar no Multicálculo</span>
          </>
        )}
      </button>

      {task.stage === "perdido" && task.lostReason && (
        <div className="mt-1.5 space-y-0.5">
          <p className="text-[11px] text-destructive">Motivo: {lostReasonLabel[task.lostReason]}</p>
          {task.lostNote && <p className="text-[11px] text-muted-foreground truncate" title={task.lostNote}>{task.lostNote}</p>}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDateShort(task.dueDate)}
        </div>
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[10px] bg-brand-soft text-brand-foreground font-semibold">
            {task.assignee}
          </AvatarFallback>
        </Avatar>
      </div>
    </>
  );
}
