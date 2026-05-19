import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DateRange } from "react-day-picker";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { team, formatDate } from "@/lib/mock/data";
import { PeriodKind, Priority, ScheduledKind, useTaskStore } from "@/lib/tasks/taskStore";
import { toast } from "sonner";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function ScheduledTasksPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { scheduled, addScheduled, removeScheduled } = useTaskStore();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(team[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("media");
  const [kind, setKind] = useState<ScheduledKind>("data");
  const [range, setRange] = useState<DateRange | undefined>();
  const [yearly, setYearly] = useState(false);
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [period, setPeriod] = useState<PeriodKind>("mensal");
  const [startDate, setStartDate] = useState<Date | undefined>();

  const submit = () => {
    if (!title.trim()) { toast.error("Informe um título"); return; }
    if (kind === "data" && !range?.from) { toast.error("Escolha uma data"); return; }
    if (kind === "semana" && weekdays.length === 0) { toast.error("Selecione ao menos um dia"); return; }
    if (kind === "periodo" && !startDate) { toast.error("Escolha a data de início"); return; }
    const from = range?.from;
    const to = range?.to ?? range?.from;
    addScheduled({
      title: title.trim(), assigneeId, priority, kind,
      startDate: kind === "data" ? from?.toISOString() : kind === "periodo" ? startDate?.toISOString() : undefined,
      endDate: kind === "data" ? to?.toISOString() : undefined,
      yearly: kind === "data" ? yearly : undefined,
      weekdays: kind === "semana" ? weekdays.map(Number) : undefined,
      period: kind === "periodo" ? period : undefined,
    });
    toast.success("Agendamento criado");
    setTitle(""); setYearly(false); setWeekdays([]); setRange(undefined); setStartDate(undefined);
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Responsável</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                <SelectContent>{team.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
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
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="periodo" /> Períodos (mensal/bimestral/trimestral)</label>
            </RadioGroup>
          </div>

          {kind === "data" && (
            <div className="space-y-2 rounded-xl bg-muted/40 p-3">
              <Label className="text-xs text-muted-foreground">Data</Label>
              <DateRangePick value={range} onChange={setRange} />
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={yearly} onCheckedChange={(v) => setYearly(!!v)} />
                Repetir anualmente (ex: aniversários)
              </label>
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
          {kind === "periodo" && (
            <div className="space-y-2 rounded-xl bg-muted/40 p-3">
              <Label className="text-xs text-muted-foreground">Recorrência</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKind)}>
                <SelectTrigger className="rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="bimestral">Bimestral</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                </SelectContent>
              </Select>
              <Label className="text-xs text-muted-foreground mt-2">Início</Label>
              <DatePick value={startDate} onChange={setStartDate} />
            </div>
          )}

          <Button className="w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>
            Programar tarefa
          </Button>

          <div>
            <h4 className="text-sm font-semibold mt-4 mb-2">Tarefas programadas ativas</h4>
            {scheduled.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa agendada.</p>
            ) : (
              <ul className="space-y-2">
                {scheduled.map((s) => (
                  <li key={s.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{describeSchedule(s)}</p>
                      </div>
                      <Badge variant="outline" className="bg-muted border-0 text-[10px]">
                        {s.kind === "data" ? "Data" : s.kind === "semana" ? "Semanal" : s.period}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeScheduled(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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

function DatePick({ value, onChange }: { value?: Date; onChange: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start rounded-xl bg-muted border-0 font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-4 w-4 mr-2" />
          {value ? formatDate(value.toISOString()) : "Selecionar data"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}

function describeSchedule(s: ReturnType<typeof useTaskStore>["scheduled"][number]) {
  if (s.kind === "data" && s.date) return `${formatDate(s.date)}${s.yearly ? " · todo ano" : ""}`;
  if (s.kind === "semana" && s.weekdays) return `Dias: ${s.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")}`;
  if (s.kind === "periodo" && s.startDate) return `${s.period} · início ${formatDate(s.startDate)}`;
  return "—";
}
