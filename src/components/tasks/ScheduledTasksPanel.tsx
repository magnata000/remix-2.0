import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DateRange } from "react-day-picker";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { team, formatDateShort } from "@/lib/mock/data";
import { PeriodKind, Priority, ScheduledKind, useTaskStore, type Recurrence } from "@/lib/tasks/taskStore";
import { describeRecurrence } from "@/lib/tasks/recurrence";
import { RecurrenceEditor } from "./RecurrenceEditor";
import { toast } from "sonner";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

type RepeatValue = "nenhuma" | PeriodKind;

const REPEAT_OPTIONS: { value: RepeatValue; label: string }[] = [
  { value: "nenhuma", label: "Não repetir" },
  { value: "mensal", label: "Mensal" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

export function ScheduledTasksPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { scheduled, addScheduled, updateScheduled, removeScheduled } = useTaskStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(team[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("media");
  const [kind, setKind] = useState<ScheduledKind>("data");
  const [range, setRange] = useState<DateRange | undefined>();
  const [repeat, setRepeat] = useState<RepeatValue>("nenhuma");
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<Recurrence>({ freq: "weekly", interval: 1, byWeekday: [1] });
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssigneeId(team[0]?.id ?? "");
    setPriority("media");
    setKind("data");
    setRange(undefined);
    setRepeat("nenhuma");
    setWeekdays([]);
    setRecurrence({ freq: "weekly", interval: 1, byWeekday: [1] });
    setEditingId(null);
  };

  const startEdit = (s: typeof scheduled[number]) => {
    setEditingId(s.id);
    setTitle(s.title);
    setDescription(s.description ?? "");
    setAssigneeId(s.assigneeId);
    setPriority(s.priority);
    setKind(s.kind);
    setRepeat(s.period ?? "nenhuma");
    setWeekdays(s.weekdays?.map(String) ?? []);
    if (s.recurrence) setRecurrence(s.recurrence);
    if (s.kind === "data" && s.startDate) {
      setRange({ from: new Date(s.startDate), to: s.endDate ? new Date(s.endDate) : undefined });
    } else {
      setRange(undefined);
    }
  };

  const submit = () => {
    if (!title.trim()) { toast.error("Informe um título"); return; }
    if (kind === "data" && !range?.from) { toast.error("Escolha uma data"); return; }
    if (kind === "data" && range?.from && range?.to && range.to.getTime() < range.from.getTime()) {
      toast.error("A data final não pode ser anterior à inicial"); return;
    }
    if (kind === "semana" && weekdays.length === 0) { toast.error("Selecione ao menos um dia"); return; }
    if (kind === "recorrente" && recurrence.freq === "weekly" && !(recurrence.byWeekday?.length)) {
      toast.error("Selecione ao menos um dia da semana"); return;
    }
    if (kind === "recorrente" && recurrence.freq === "monthly" && !recurrence.byMonthDay) {
      toast.error("Informe o dia do mês"); return;
    }
    const from = range?.from;
    const to = range?.to ?? range?.from;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      assigneeId, priority, kind,
      startDate: kind === "data" ? from?.toISOString() : undefined,
      endDate: kind === "data" ? to?.toISOString() : undefined,
      weekdays: kind === "semana" ? weekdays.map(Number) : undefined,
      period: kind === "data" && repeat !== "nenhuma" ? repeat : undefined,
      recurrence: kind === "recorrente" ? recurrence : undefined,
    };
    if (editingId) {
      updateScheduled(editingId, payload);
      toast.success("Agendamento atualizado");
    } else {
      addScheduled(payload);
      toast.success("Agendamento criado");
    }
    resetForm();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Tarefas agendadas</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs text-muted-foreground">Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Felicitar aniversariantes" className="mt-1.5 rounded-xl bg-muted border-0" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detalhes da tarefa (opcional)" className="mt-1.5 rounded-xl bg-muted border-0 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Responsável</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os colaboradores</SelectItem>
                  {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Tipo de recorrência</Label>
            <RadioGroup value={kind} onValueChange={(v) => setKind(v as ScheduledKind)} className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="data" /> Data específica (avulsa)</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="semana" /> Dias da semana</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="recorrente" /> Recorrência avançada</label>
            </RadioGroup>
          </div>

          {kind === "data" && (
            <div className="space-y-2 rounded-xl bg-muted/40 p-3">
              <Label className="text-xs text-muted-foreground">Data</Label>
              <DateRangePick value={range} onChange={setRange} />
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Repetir</span>
                <Select value={repeat} onValueChange={(v) => setRepeat(v as RepeatValue)}>
                  <SelectTrigger className="h-8 w-auto min-w-[8rem] rounded-lg border-0 bg-transparent text-xs text-muted-foreground hover:text-foreground focus:ring-0 shadow-none px-2 gap-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {REPEAT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {kind === "semana" && (
            <div className="space-y-2 rounded-xl bg-muted/40 p-3">
              <Label className="text-xs text-muted-foreground">Dias da semana</Label>
              <ToggleGroup type="multiple" value={weekdays} onValueChange={setWeekdays} className="justify-start flex-wrap">
                {WEEKDAY_LABELS.map((l, i) => (
                  <ToggleGroupItem key={i} value={String(i)} className="h-9 w-9 rounded-lg">{l}</ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          <div className="flex gap-2">
            <Button className="flex-1 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>
              {editingId ? "Salvar alterações" : "Programar tarefa"}
            </Button>
            {editingId && (
              <Button variant="outline" className="rounded-xl" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold mt-4 mb-2">Tarefas programadas ativas</h4>
            {scheduled.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa agendada.</p>
            ) : (
              <ul className="space-y-2">
                {scheduled.map((s) => (
                  <li key={s.id} className={cn("rounded-xl border border-border p-3", editingId === s.id && "ring-1 ring-brand/40")}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate flex-1 min-w-0">{s.title}</p>
                          <Badge variant="outline" className="bg-muted border-0 text-[10px] shrink-0">
                            {s.kind === "data" ? "Data" : "Semanal"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{describeSchedule(s)}</p>
                        {s.description && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">{s.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { if (editingId === s.id) resetForm(); removeScheduled(s.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DateRangePick({ value, onChange }: { value?: DateRange; onChange: (r: DateRange | undefined) => void }) {
  const label = (() => {
    if (!value?.from) return "Selecionar intervalo";
    const from = formatDateShort(value.from.toISOString());
    if (!value.to || value.to.getTime() === value.from.getTime()) return from;
    return `${from} → ${formatDateShort(value.to.toISOString())}`;
  })();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start rounded-xl bg-muted border-0 font-normal", !value?.from && "text-muted-foreground")}>
          <CalendarIcon className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={(r) => {
            if (r?.from && r?.to && r.to.getTime() < r.from.getTime()) {
              toast.error("A data final não pode ser anterior à inicial");
              onChange({ from: r.to, to: undefined });
              return;
            }
            onChange(r);
          }}
          initialFocus
          numberOfMonths={1}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

function describeSchedule(s: ReturnType<typeof useTaskStore>["scheduled"][number]) {
  if (s.kind === "data" && s.startDate) {
    const start = formatDateShort(s.startDate);
    const end = s.endDate ? formatDateShort(s.endDate) : start;
    const range = start === end ? start : `${start} → ${end}`;
    return `${range}${s.period ? ` · ${s.period}` : ""}`;
  }
  if (s.kind === "semana" && s.weekdays) return `Dias: ${s.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")}`;
  return "—";
}
