import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { team, formatBRL, formatDateShort, type Branch, type KanbanStage } from "@/lib/mock/data";
import { useClients } from "@/lib/portfolio/clientStore";
import { usePipelineStore, type Opportunity } from "@/lib/pipeline/opportunityStore";
import { toast } from "sonner";

type Props = {
  opportunity: Opportunity | null;
  onOpenChange: (v: boolean) => void;
};

const BRANCHES: Branch[] = ["Auto", "Vida", "Residencial", "Empresarial", "Saúde", "Consórcio"];
const STAGES: { key: KanbanStage; label: string; dot: string }[] = [
  { key: "lead", label: "Lead", dot: "bg-info" },
  { key: "cotacao", label: "Cotação", dot: "bg-warning" },
  { key: "negociacao", label: "Negociação", dot: "bg-brand" },
  { key: "fechado", label: "Fechado", dot: "bg-success" },
  { key: "perdido", label: "Perdido", dot: "bg-destructive" },
];

const initialsOf = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

// Parse "1.234,56" or "1234.56" or "1234,56" into a number rounded to 2 decimals.
const parseMoney = (raw: string): number => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

export function EditOpportunityDialog({ opportunity, onOpenChange }: Props) {
  const { updateOpportunity, moveStage } = usePipelineStore();
  const { clients } = useClients();

  const [clientName, setClientName] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [branch, setBranch] = useState<Branch>("Auto");
  const [stage, setStage] = useState<KanbanStage>("lead");
  const [estimatedValue, setEstimatedValue] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [assigneeId, setAssigneeId] = useState(team[0]?.id ?? "");

  useEffect(() => {
    if (!opportunity) return;
    setClientName(opportunity.clientName);
    setTitle(opportunity.title);
    setBranch(opportunity.branch);
    setStage(opportunity.stage);
    setEstimatedValue(opportunity.estimatedValue > 0 ? formatBRL(opportunity.estimatedValue) : "");
    setDueDate(opportunity.dueDate ? new Date(opportunity.dueDate) : undefined);
    const m = team.find((t) => initialsOf(t.name) === opportunity.assignee);
    setAssigneeId(m?.id ?? team[0]?.id ?? "");
  }, [opportunity]);

  const valueNum = useMemo(() => parseMoney(estimatedValue), [estimatedValue]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!clientName.trim()) e.client = "Informe o cliente";
    if (!title.trim()) e.title = "Informe um título";
    else if (title.length > 80) e.title = "Máx. 80 caracteres";
    if (!dueDate) e.date = "Selecione o prazo";
    return e;
  }, [clientName, title, dueDate]);

  const valid = Object.keys(errors).length === 0;

  const submit = () => {
    if (!opportunity || !valid || !dueDate) {
      toast.error("Revise os campos obrigatórios");
      return;
    }
    const member = team.find((m) => m.id === assigneeId);
    updateOpportunity(opportunity.id, {
      title: title.trim(),
      clientName: clientName.trim(),
      branch,
      estimatedValue: valueNum,
      dueDate: dueDate.toISOString().slice(0, 10),
      assignee: initialsOf(member?.name ?? opportunity.assignee),
    });
    if (stage !== opportunity.stage) {
      moveStage(opportunity.id, stage);
    }
    toast.success("Oportunidade atualizada");
    onOpenChange(false);
  };

  return (
    <Dialog open={!!opportunity} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar oportunidade</DialogTitle></DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</h3>
            <div>
              <Label className="text-xs text-muted-foreground">Cliente *</Label>
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
              {errors.client && <p className="text-xs text-destructive mt-1">{errors.client}</p>}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Oportunidade</h3>

            <div>
              <Label className="text-xs text-muted-foreground">Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="mt-1.5 rounded-xl bg-muted border-0" />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Ramo *</Label>
                <Select value={branch} onValueChange={(v) => setBranch(v as Branch)}>
                  <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Etapa</Label>
                <Select value={stage} onValueChange={(v) => setStage(v as KanbanStage)}>
                  <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        <span className="inline-flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Valor estimado</Label>
                <Input
                  inputMode="decimal"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  onBlur={() => { if (valueNum > 0) setEstimatedValue(formatBRL(valueNum)); else setEstimatedValue(""); }}
                  onFocus={() => setEstimatedValue(valueNum > 0 ? String(valueNum).replace(".", ",") : "")}
                  placeholder="0,00"
                  className="mt-1.5 rounded-xl bg-muted border-0"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Prazo *</Label>
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
                {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atribuição</h3>
            <div>
              <Label className="text-xs text-muted-foreground">Responsável</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {team.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand-foreground">
                          {initialsOf(m.name)}
                        </span>
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit} disabled={!valid}>
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
