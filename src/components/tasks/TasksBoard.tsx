import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Settings, CalendarClock, Search, X } from "lucide-react";
import { team, clients } from "@/lib/mock/data";
import { Priority, TaskItem, useTaskStore } from "@/lib/tasks/taskStore";
import { TaskCard } from "./TaskCard";
import { NewTaskDialog } from "./NewTaskDialog";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { ManageColumnsDialog } from "./ManageColumnsDialog";
import { ScheduledTasksPanel } from "./ScheduledTasksPanel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function TasksBoard() {
  const { columns, tasks, moveTask, deleteTask } = useTaskStore();
  const [confirmDelete, setConfirmDelete] = useState<TaskItem | null>(null);
  const [editTask, setEditTask] = useState<TaskItem | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [detail, setDetail] = useState<TaskItem | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  // filters
  const [fAssignee, setFAssignee] = useState<string>("todos");
  const [fPriority, setFPriority] = useState<string[]>([]);
  const [fClient, setFClient] = useState<string>("");
  const [clientOpen, setClientOpen] = useState(false);
  const [fSort, setFSort] = useState<"recent" | "old">("recent");

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (fAssignee !== "todos") list = list.filter((t) => t.assigneeId === fAssignee || t.assigneeId === "all");
    if (fPriority.length) list = list.filter((t) => fPriority.includes(t.priority));
    if (fClient) list = list.filter((t) => t.clientName?.toLowerCase().includes(fClient.toLowerCase()));
    list.sort((a, b) => fSort === "recent"
      ? +new Date(b.createdAt) - +new Date(a.createdAt)
      : +new Date(a.createdAt) - +new Date(b.createdAt));
    return list;
  }, [tasks, fAssignee, fPriority, fClient, fSort]);

  const byColumn = (id: string) => filtered.filter((t) => t.columnId === id);

  // Live update from detail dialog when state changes
  const currentDetail = detail ? tasks.find((t) => t.id === detail.id) ?? null : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">Demandas internas, agendamentos e delegações da corretora.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setScheduleOpen(true)}>
            <CalendarClock className="h-4 w-4 mr-2" /> Agendamentos
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => setManageOpen(true)}>
            <Settings className="h-4 w-4 mr-2" /> Gerenciar etapas
          </Button>
          <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova tarefa
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 rounded-2xl border-border shadow-none">
        <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
          <Select value={fAssignee} onValueChange={setFAssignee}>
            <SelectTrigger className="lg:w-48 rounded-xl bg-muted border-0"><SelectValue placeholder="Colaborador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os colaboradores</SelectItem>
              {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <ToggleGroup type="multiple" value={fPriority} onValueChange={setFPriority} className="justify-start">
            <ToggleGroupItem value="alta" className="rounded-lg h-9 text-xs">Alta</ToggleGroupItem>
            <ToggleGroupItem value="media" className="rounded-lg h-9 text-xs">Média</ToggleGroupItem>
            <ToggleGroupItem value="baixa" className="rounded-lg h-9 text-xs">Baixa</ToggleGroupItem>
          </ToggleGroup>
          <Popover open={clientOpen} onOpenChange={setClientOpen}>
            <PopoverTrigger asChild>
              <div className="relative lg:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  readOnly
                  value={fClient}
                  placeholder="Buscar cliente..."
                  className="pl-9 rounded-xl bg-muted border-0 cursor-pointer"
                  onClick={() => setClientOpen(true)}
                />
                {fClient && (
                  <button onClick={(e) => { e.stopPropagation(); setFClient(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Digite o nome..." />
                <CommandList>
                  <CommandEmpty>Nenhum cliente.</CommandEmpty>
                  <CommandGroup>
                    {clients.map((c) => (
                      <CommandItem key={c.id} value={c.name} onSelect={() => { setFClient(c.name); setClientOpen(false); }}>
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Select value={fSort} onValueChange={(v) => setFSort(v as "recent" | "old")}>
            <SelectTrigger className="lg:w-44 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="old">Mais antigas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Board */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0,1fr))` }}
      >
        {columns.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId) { moveTask(dragId, col.id); setDragId(null); } }}
            className="bg-muted/40 rounded-2xl min-h-[400px] overflow-hidden flex flex-col"
          >
            <div className="h-1" style={{ background: col.color }} />
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                <span className="font-semibold text-sm" style={{ color: col.color }}>{col.title}</span>
                <span className="text-xs text-muted-foreground">({byColumn(col.id).length})</span>
              </div>
            </div>
            <div className="px-3 pb-3 space-y-2 flex-1">
              {byColumn(col.id).map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <TaskCard
                    task={t}
                    onClick={() => setDetail(t)}
                    onEdit={() => setEditTask(t)}
                    onDelete={() => setConfirmDelete(t)}
                  />
                </div>
              ))}
              {byColumn(col.id).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Sem tarefas</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <NewTaskDialog open={newOpen} onOpenChange={setNewOpen} />
      <NewTaskDialog
        open={!!editTask}
        onOpenChange={(v) => { if (!v) setEditTask(null); }}
        task={editTask ?? undefined}
      />
      <ManageColumnsDialog open={manageOpen} onOpenChange={setManageOpen} />
      <ScheduledTasksPanel open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <TaskDetailDialog task={currentDetail} onOpenChange={(v) => { if (!v) setDetail(null); }} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete ? `"${confirmDelete.title}" será removida. Esta ação não pode ser desfeita.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) {
                  deleteTask(confirmDelete.id);
                  toast.success("Tarefa excluída");
                  setConfirmDelete(null);
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
