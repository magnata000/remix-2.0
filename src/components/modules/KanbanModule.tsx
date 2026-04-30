import { useState } from "react";
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
import { MoreHorizontal, Plus, GripVertical, Calendar } from "lucide-react";
import { tasks as initialTasks, formatBRL, formatDate, type KanbanStage, type Task } from "@/lib/mock/data";

const stages: { key: KanbanStage; label: string; color: string }[] = [
  { key: "lead", label: "Lead", color: "bg-info/15 text-info" },
  { key: "cotacao", label: "Cotação", color: "bg-warning/15 text-warning" },
  { key: "negociacao", label: "Negociação", color: "bg-brand/30 text-brand-foreground" },
  { key: "fechado", label: "Fechado", color: "bg-success/15 text-success" },
];

export function KanbanModule() {
  const [items, setItems] = useState<Task[]>(initialTasks);
  const [dragId, setDragId] = useState<string | null>(null);

  const move = (id: string, stage: KanbanStage) =>
    setItems((arr) => arr.map((t) => (t.id === id ? { ...t, stage } : t)));

  const byStage = (s: KanbanStage) => items.filter((t) => t.stage === s);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pipeline de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Arraste para mover • {items.length} oportunidades
          </p>
        </div>
        <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="h-4 w-4 mr-2" /> Nova oportunidade
        </Button>
      </div>

      {/* Desktop kanban */}
      <div className="hidden md:grid grid-cols-4 gap-4">
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
                  className="bg-card border border-border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-brand transition"
                >
                  <KanbanCardBody task={t} onMove={move} />
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
        <TabsList className="grid grid-cols-4 w-full bg-muted rounded-xl">
          {stages.map((s) => (
            <TabsTrigger
              key={s.key}
              value={s.key}
              className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs"
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
                  <KanbanCardBody task={t} onMove={move} />
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function KanbanCardBody({ task, onMove }: { task: Task; onMove: (id: string, s: KanbanStage) => void }) {
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
      <div className="mt-3 flex items-center justify-between">
        <Badge variant="outline" className="rounded-full text-xs">
          {task.branch}
        </Badge>
        <p className="text-sm font-bold">{formatBRL(task.estimatedValue)}</p>
      </div>
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
