import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreHorizontal, Plus, GripVertical, Calendar, Trophy, Calculator, Link2 } from "lucide-react";
import { formatBRL, formatDateShort, type KanbanStage, type Task } from "@/lib/mock/data";
import { usePipelineStore } from "@/lib/pipeline/opportunityStore";
import { useQuoteStore } from "@/lib/multicalc/quoteStore";
import { useNavigation } from "@/lib/navigation";
import { TasksBoard } from "@/components/tasks/TasksBoard";

const stages: { key: KanbanStage; label: string; color: string }[] = [
  { key: "lead", label: "Lead", color: "bg-info/15 text-info" },
  { key: "cotacao", label: "Cotação", color: "bg-warning/15 text-warning" },
  { key: "negociacao", label: "Negociação", color: "bg-brand/30 text-brand-foreground" },
  { key: "fechado", label: "Fechado", color: "bg-success/15 text-success" },
  { key: "perdido", label: "Perdido", color: "bg-destructive/15 text-destructive" },
];

export function KanbanModule() {
  const { opportunities, moveStage } = usePipelineStore();
  const { groups } = useQuoteStore();
  const { goTo, consumeFocus } = useNavigation();
  const [dragId, setDragId] = useState<string | null>(null);
  const initialFocus = useMemo(() => consumeFocus(), [consumeFocus]);
  const [highlightId] = useState<string | null>(initialFocus.opportunityId ?? null);

  const move = (id: string, stage: KanbanStage) => moveStage(id, stage);

  const byStage = (s: KanbanStage) => opportunities.filter((t) => t.stage === s);

  const groupFor = (quoteGroupId?: string) => quoteGroupId ? groups.find((g) => g.groupId === quoteGroupId) : undefined;

  const openQuote = (quoteGroupId?: string) => {
    if (quoteGroupId) goTo("multicalc", { quoteGroupId });
    else goTo("multicalc");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quadro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pipeline de vendas e tarefas internas da corretora
        </p>
      </div>

      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="h-10">
          <TabsTrigger value="pipeline">Pipeline de Vendas</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-5 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Arraste para mover • {opportunities.length} oportunidades · vinculadas ao Multicálculo
              </p>
            </div>
            <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
              <Plus className="h-4 w-4 mr-2" /> Nova oportunidade
            </Button>
          </div>


      {/* Desktop kanban */}
      <div className="hidden md:grid grid-cols-5 gap-4">
        {stages.map((s) => (
          <div
            key={s.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId) {
                move(dragId, s.key);
                setDragId(null);
              }
            }}
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
                  className={`bg-card border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-brand transition ${
                    highlightId === t.id ? "border-brand ring-2 ring-brand/30" : "border-border"
                  }`}
                >
                  <KanbanCardBody
                    task={t}
                    quoteSummary={groupFor(t.quoteGroupId)}
                    onMove={move}
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
            <TabsTrigger
              key={s.key}
              value={s.key}
              className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-[11px]"
            >
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
                <div key={t.id} className="bg-card border border-border rounded-xl p-3">
                  <KanbanCardBody
                    task={t}
                    quoteSummary={groupFor(t.quoteGroupId)}
                    onMove={move}
                    onOpenQuote={() => openQuote(t.quoteGroupId)}
                  />
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
        </TabsContent>

        <TabsContent value="tarefas" className="mt-5">
          <TasksBoard />
        </TabsContent>
      </Tabs>
    </div>
  );
}


type GroupSummary = ReturnType<typeof useQuoteStore>["groups"][number];

function KanbanCardBody({
  task, quoteSummary, onMove, onOpenQuote,
}: {
  task: Task;
  quoteSummary?: GroupSummary;
  onMove: (id: string, s: KanbanStage) => void;
  onOpenQuote: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <GripVertical className="h-4 w-4 text-muted-foreground hidden md:block mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{task.title}</p>
            <p className="text-xs text-muted-foreground truncate">{task.clientName}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenQuote}>
              {task.quoteGroupId ? "Abrir cotação" : "Nova cotação"}
            </DropdownMenuItem>
            {stages
              .filter((s) => s.key !== task.stage)
              .map((s) => (
                <DropdownMenuItem key={s.key} onClick={() => onMove(task.id, s.key)}>
                  Mover para {s.label}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Badge variant="outline" className="rounded-full text-xs">
          {task.branch}
        </Badge>
        <p className="text-sm font-bold">{formatBRL(task.estimatedValue)}</p>
      </div>

      {/* Quote link / CTA */}
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
        <p className="mt-1.5 text-[11px] text-destructive">Motivo: {task.lostReason}</p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(task.dueDate)}
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
