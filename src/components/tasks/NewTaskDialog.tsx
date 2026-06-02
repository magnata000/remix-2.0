import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { team, clients, formatDateShort } from "@/lib/mock/data";
import { Priority, TaskItem, useTaskStore } from "@/lib/tasks/taskStore";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultColumnId?: string;
  task?: TaskItem;
};

export function NewTaskDialog({ open, onOpenChange, defaultColumnId, task }: Props) {
  const { columns, addTask, updateTaskFields } = useTaskStore();
  const isEdit = !!task;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<Priority>("media");
  const [assigneeId, setAssigneeId] = useState(team[0]?.id ?? "");
  const [clientName, setClientName] = useState<string>("");
  const [clientOpen, setClientOpen] = useState(false);
  const [columnId, setColumnId] = useState(defaultColumnId ?? columns[0]?.id ?? "");

  const reset = () => {
    setTitle(""); setDescription(""); setDueDate(undefined);
    setPriority("media"); setAssigneeId(team[0]?.id ?? ""); setClientName("");
    setColumnId(defaultColumnId ?? columns[0]?.id ?? "");
  };

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setPriority(task.priority);
      setAssigneeId(task.assigneeId);
      setClientName(task.clientName ?? "");
      setColumnId(task.columnId);
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  const submit = () => {
    if (!title.trim()) { toast.error("Título é obrigatório"); return; }
    if (isEdit && task) {
      updateTaskFields(task.id, {
        title: title.trim(),
        description,
        dueDate: dueDate?.toISOString(),
        priority,
        assigneeId,
        clientName: clientName || undefined,
        columnId,
      });
      toast.success("Tarefa atualizada");
    } else {
      addTask({
        title: title.trim(),
        description,
        dueDate: dueDate?.toISOString(),
        priority,
        assigneeId,
        clientName: clientName || undefined,
        columnId,
      });
      toast.success("Tarefa criada");
      reset();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isEdit) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Solicitar documentos" className="mt-1.5 rounded-xl bg-muted border-0" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5 rounded-xl bg-muted border-0 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Prazo de entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("mt-1.5 w-full justify-start rounded-xl bg-muted border-0 font-normal", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dueDate ? formatDateShort(dueDate.toISOString()) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Colaborador</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Coluna inicial</Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cliente (opcional)</Label>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("mt-1.5 w-full justify-start rounded-xl bg-muted border-0 font-normal", !clientName && "text-muted-foreground")}>
                  {clientName || "Buscar cliente..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Digite o nome..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => { setClientName(""); setClientOpen(false); }}>
                        — Sem cliente —
                      </CommandItem>
                      {clients.map((c) => (
                        <CommandItem key={c.id} value={c.name} onSelect={() => { setClientName(c.name); setClientOpen(false); }}>
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>{isEdit ? "Salvar alterações" : "Criar tarefa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
