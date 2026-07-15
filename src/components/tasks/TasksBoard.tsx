import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Settings, CalendarClock, Search, X, MessageSquare, Paperclip, User as UserIcon } from "lucide-react";
import { team, clients } from "@/lib/mock/data";
import { TaskItem, useTaskStore } from "@/lib/tasks/taskStore";
import { searchTasks } from "@/lib/tasks/searchTasks";
import { runWorkflows } from "@/lib/tasks/workflowEngine";
import { usePolicyStore } from "@/lib/portfolio/policyStore";
import { TaskCard } from "./TaskCard";
import { NewTaskDialog } from "./NewTaskDialog";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { ManageColumnsDialog } from "./ManageColumnsDialog";
import { ScheduledTasksPanel } from "./ScheduledTasksPanel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useSlaTicker } from "@/hooks/useSlaTicker";
import { toast } from "sonner";


export function TasksBoard() {
  useSlaTicker();
  const { columns, tasks, moveTask, deleteTask, bulkAddTasks } = useTaskStore();
  const { policies } = usePolicyStore();
  const [confirmDelete, setConfirmDelete] = useState<TaskItem | null>(null);
  const [editTask, setEditTask] = useState<TaskItem | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [detail, setDetail] = useState<TaskItem | null>(null);
  const [detailInitialSearch, setDetailInitialSearch] = useState<string>("");
  const [dragId, setDragId] = useState<string | null>(null);

  // Busca unificada (clientes + mensagens + documentos)
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // filters
  const [fAssignee, setFAssignee] = useState<string>("todos");
  const [fPriority, setFPriority] = useState<string[]>([]);
  const [fClient, setFClient] = useState<string>("");
  const [fSort, setFSort] = useState<"recent" | "old">("recent");

  // Workflow engine — roda no mount da aba, dedupe via ref
  const defaultColumnId = columns[0]?.id;
  const workflowsRanRef = useRef(false);
  useEffect(() => {
    if (workflowsRanRef.current) return;
    if (!defaultColumnId) return;
    workflowsRanRef.current = true;
    const created = runWorkflows({ policies, existingTasks: tasks, defaultColumnId });
    if (created.length) bulkAddTasks(created);
  }, [defaultColumnId, policies, tasks, bulkAddTasks]);

  const term = searchTerm.trim();
  const clientMatches = useMemo(() => {
    if (!term) return [];
    const q = term.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5);
  }, [term]);
  const taskMatches = useMemo(() => (term ? searchTasks(tasks, term) : []), [tasks, term]);

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
      <p className="text-sm text-muted-foreground">Demandas internas, agendamentos e delegações da corretora.</p>

      <Card className="p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
            <Popover open={searchOpen} onOpenChange={(v) => { setSearchOpen(v); if (!v) setSearchTerm(""); }}>
              <PopoverTrigger asChild>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={fClient || searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); if (!searchOpen) setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Buscar cliente, mensagem ou documento…"
                    className="pl-9 rounded-xl bg-muted border-0"
                  />
                  {(fClient || searchTerm) && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFClient(""); setSearchTerm(""); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Limpar busca"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] min-w-[320px] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="max-h-[400px] overflow-y-auto">
                  {!term && (
                    <p className="p-4 text-xs text-muted-foreground text-center">
                      Digite para buscar clientes, mensagens e anexos.
                    </p>
                  )}
                  {term && clientMatches.length === 0 && taskMatches.length === 0 && (
                    <p className="p-4 text-xs text-muted-foreground text-center">Nenhum resultado.</p>
                  )}
                  {clientMatches.length > 0 && (
                    <div>
                      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">Clientes</p>
                      {clientMatches.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setFClient(c.name); setSearchTerm(""); setSearchOpen(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted border-b border-border last:border-0 flex items-center gap-2"
                        >
                          <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {taskMatches.length > 0 && (
                    <div>
                      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">Mensagens e documentos</p>
                      {taskMatches.map(({ task: t, matches }) => {
                        const col = columns.find((c) => c.id === t.columnId);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setDetailInitialSearch(term);
                              setDetail(t);
                              setSearchOpen(false);
                              setSearchTerm("");
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-muted border-b border-border last:border-0"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: col?.color }} />
                              <span className="text-xs font-semibold truncate flex-1">{t.title}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">{col?.title}</span>
                            </div>
                            <ul className="space-y-0.5">
                              {matches.slice(0, 3).map((m) => (
                                <li key={`${m.kind}-${m.id}`} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                  {m.kind === "comment"
                                    ? <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                                    : <Paperclip className="h-3 w-3 mt-0.5 shrink-0" />}
                                  <span className="break-words">{m.snippet}</span>
                                </li>
                              ))}
                              {matches.length > 3 && (
                                <li className="text-[10px] text-muted-foreground">+{matches.length - 3} resultado(s)</li>
                              )}
                            </ul>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Select value={fAssignee} onValueChange={setFAssignee}>
              <SelectTrigger className="w-full sm:w-48 rounded-xl bg-muted border-0"><SelectValue placeholder="Colaborador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os colaboradores</SelectItem>
                {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={fSort} onValueChange={(v) => setFSort(v as "recent" | "old")}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="old">Mais antigas</SelectItem>
              </SelectContent>
            </Select>

            <ToggleGroup type="multiple" value={fPriority} onValueChange={setFPriority} className="justify-start shrink-0">
              <ToggleGroupItem value="alta" className="rounded-lg h-9 text-xs">Alta</ToggleGroupItem>
              <ToggleGroupItem value="media" className="rounded-lg h-9 text-xs">Média</ToggleGroupItem>
              <ToggleGroupItem value="baixa" className="rounded-lg h-9 text-xs">Baixa</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Button variant="outline" className="rounded-xl" onClick={() => setScheduleOpen(true)}>
              <CalendarClock className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Agendamentos</span>
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setManageOpen(true)}>
              <Settings className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Gerenciar etapas</span>
            </Button>
            <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Nova tarefa</span>
            </Button>
          </div>

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
      <TaskDetailDialog
        task={currentDetail}
        initialSearch={detailInitialSearch}
        onOpenChange={(v) => { if (!v) { setDetail(null); setDetailInitialSearch(""); } }}
      />


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
