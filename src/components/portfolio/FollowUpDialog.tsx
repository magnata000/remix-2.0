import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";
import { useClients } from "@/lib/portfolio/clientStore";
import { useFollowUps } from "@/lib/portfolio/followUpStore";
import { usePolicies } from "@/lib/portfolio/policyStore";
import { useTaskStore } from "@/lib/tasks/taskStore";
import type { FollowUp, FollowUpType, FollowUpStatus, Client } from "@/lib/mock/data";
import { toast } from "sonner";

const typeLabel: Record<FollowUpType, string> = {
  ligacao: "Ligação",
  email: "E-mail",
  whatsapp: "WhatsApp",
  reuniao: "Reunião presencial",
  videocall: "Videocall",
  nota: "Nota interna",
};

const statusLabel: Record<FollowUpStatus, string> = {
  agendado: "Agendado",
  realizado: "Realizado",
  cancelado: "Cancelado",
  adiado: "Adiado",
};

const typeOptions: FollowUpType[] = ["ligacao", "email", "whatsapp", "reuniao", "videocall", "nota"];
const statusOptions: FollowUpStatus[] = ["agendado", "realizado", "cancelado", "adiado"];

const isoDate = (d?: Date) => (d ? d.toISOString().slice(0, 10) : "");

function isValidTime(v: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  followUp?: FollowUp | null;
  defaultClient?: Client | null;
};

export function FollowUpDialog({ open, onOpenChange, followUp, defaultClient }: Props) {
  const isEdit = !!followUp;
  const { clients } = useClients();
  const { policies } = usePolicies();
  const { addFollowUp, updateFollowUp } = useFollowUps();
  const { addTask } = useTaskStore();

  const [clientId, setClientId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [type, setType] = useState<FollowUpType>("ligacao");
  const [status, setStatus] = useState<FollowUpStatus>("agendado");
  const [notes, setNotes] = useState<string>("");
  const [createTask, setCreateTask] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (isEdit && followUp) {
      setClientId(followUp.clientId);
      setDate(followUp.date);
      setTime(followUp.time ?? "");
      setType(followUp.type);
      setStatus(followUp.status);
      setNotes(followUp.notes);
      setCreateTask(false);
    } else {
      setClientId(defaultClient?.id ?? "");
      setDate(isoDate(new Date()));
      setTime("");
      setType("ligacao");
      setStatus("agendado");
      setNotes("");
      setCreateTask(false);
    }
    setErrors({});
  }, [open, isEdit, followUp, defaultClient]);

  const selectedClient = clients.find((c) => c.id === clientId);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!clientId) errs.clientId = "Selecione um cliente";
    if (!date) errs.date = "Data obrigatória";
    if (time && !isValidTime(time)) errs.time = "Hora inválida (HH:MM)";
    if (!type) errs.type = "Tipo obrigatório";
    if (!status) errs.status = "Status obrigatório";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = () => {
    if (!validate()) return;
    if (!selectedClient) return;

    const payload = {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      date,
      time: time || undefined,
      type,
      status,
      notes,
    };

    let linkedTaskId: string | undefined;
    if (createTask && status === "agendado") {
      const activePolicy = policies.find(
        (p) => p.clientName === selectedClient.name && p.status === "ativa",
      );
      const branch = activePolicy?.branch ?? "Auto";
      const task = addTask({
        title: `Follow-up: ${selectedClient.name}`,
        description: notes,
        dueDate: date,
        priority: "media",
        assigneeId: "", // colaborativo — sem dono fixo
        clientName: selectedClient.name,
        columnId: "c-demanda",
      });
      linkedTaskId = task.id;
    }

    if (isEdit && followUp) {
      updateFollowUp(followUp.id, { ...payload, createdTaskId: linkedTaskId ?? followUp.createdTaskId });
      toast.success("Follow-up atualizado");
    } else {
      addFollowUp({ ...payload, createdTaskId: linkedTaskId });
      toast.success("Follow-up criado");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar follow-up" : "Novo follow-up"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Cliente *</Label>
            <Select value={clientId} onValueChange={setClientId} disabled={!!defaultClient}>
              <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                <SelectValue placeholder="Selecionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-xs text-destructive mt-1">{errors.clientId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "mt-1.5 w-full justify-start rounded-xl bg-muted border-0 font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {date ? formatDateShort(date) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(date) : undefined}
                    onSelect={(d) => setDate(d ? isoDate(d) : "")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Hora</Label>
              <div className="relative mt-1.5">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-9 rounded-xl bg-muted border-0"
                />
              </div>
              {errors.time && <p className="text-xs text-destructive mt-1">{errors.time}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Tipo de contato *</Label>
              <Select value={type} onValueChange={(v) => setType(v as FollowUpType)}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {typeLabel[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as FollowUpStatus)}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Anotações / Resultado</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o conteúdo ou resultado do follow-up..."
              className="mt-1.5 w-full min-h-[80px] rounded-xl bg-muted border-0 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {!isEdit && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="create-task"
                checked={createTask}
                onCheckedChange={(v) => setCreateTask(v === true)}
              />
              <Label htmlFor="create-task" className="text-xs text-muted-foreground cursor-pointer">
                Criar tarefa no Kanban vinculada a este cliente
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={onSubmit}>
            {isEdit ? "Salvar" : "Criar follow-up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
