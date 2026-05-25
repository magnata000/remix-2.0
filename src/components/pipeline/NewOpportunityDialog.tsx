import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { clients, team, formatBRL, formatDateShort, type Branch, type KanbanStage } from "@/lib/mock/data";
import { usePipelineStore } from "@/lib/pipeline/opportunityStore";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; defaultClientName?: string };

const BRANCHES: Branch[] = ["Auto", "Vida", "Residencial", "Empresarial", "Saúde"];
const STAGES: { key: KanbanStage; label: string; dot: string }[] = [
  { key: "lead", label: "Lead", dot: "bg-info" },
  { key: "cotacao", label: "Cotação", dot: "bg-warning" },
  { key: "negociacao", label: "Negociação", dot: "bg-brand" },
];

const initialsOf = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export function NewOpportunityDialog({ open, onOpenChange, defaultClientName }: Props) {
  const { createOpportunity } = usePipelineStore();

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientId, setClientId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [clientOpen, setClientOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [branch, setBranch] = useState<Branch>("Auto");
  const [stage, setStage] = useState<KanbanStage>("lead");
  const [estimatedValue, setEstimatedValue] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d;
  });

  const [assigneeId, setAssigneeId] = useState(team[0]?.id ?? "");

  const reset = () => {
    setClientMode("existing"); setClientId(""); setClientName(""); setPhone(""); setEmail("");
    setTitle(""); setBranch("Auto"); setStage("lead"); setEstimatedValue("");
    const d = new Date(); d.setDate(d.getDate() + 7); setDueDate(d);
    setAssigneeId(team[0]?.id ?? "");
    if (defaultClientName) {
      const c = clients.find((x) => x.name === defaultClientName);
      if (c) {
        setClientMode("existing");
        setClientId(c.id); setClientName(c.name); setPhone(c.phone); setEmail(c.email);
      } else {
        setClientMode("new");
        setClientName(defaultClientName);
      }
    }
  };

  useEffect(() => { if (open) reset(); /* eslint-disable-next-line */ }, [open]);

  const selectClient = (id: string) => {
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setClientId(id); setClientName(c.name); setPhone(c.phone); setEmail(c.email);
    setClientOpen(false);
  };

  const valueNum = useMemo(() => Number(estimatedValue.replace(/\D/g, "")) || 0, [estimatedValue]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!clientName.trim()) e.client = "Selecione ou informe o cliente";
    if (!title.trim()) e.title = "Informe um título";
    else if (title.length > 80) e.title = "Máx. 80 caracteres";
    if (valueNum <= 0) e.value = "Valor deve ser maior que zero";
    if (!dueDate) e.date = "Selecione o prazo";
    else {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (dueDate < today) e.date = "Prazo não pode ser anterior a hoje";
    }
    return e;
  }, [clientName, title, valueNum, dueDate]);

  const valid = Object.keys(errors).length === 0;

  const submit = () => {
    if (!valid || !dueDate) {
      toast.error("Revise os campos obrigatórios");
      return;
    }
    const member = team.find((m) => m.id === assigneeId);
    createOpportunity({
      title: title.trim(),
      clientName: clientName.trim(),
      branch,
      estimatedValue: valueNum,
      dueDate: dueDate.toISOString().slice(0, 10),
      assignee: initialsOf(member?.name ?? "AS"),
      stage,
    });
    toast.success("Oportunidade criada");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova oportunidade</DialogTitle></DialogHeader>

        <div className="space-y-5">
          {/* Bloco 1 — Cliente */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs rounded-lg"
                onClick={() => {
                  const next = clientMode === "existing" ? "new" : "existing";
                  setClientMode(next);
                  setClientId(""); setClientName(""); setPhone(""); setEmail("");
                }}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                {clientMode === "existing" ? "Novo cliente" : "Cliente existente"}
              </Button>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Cliente *</Label>
              {clientMode === "existing" ? (
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
                            <CommandItem key={c.id} value={c.name} onSelect={() => selectClient(c.id)}>
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome completo" className="mt-1.5 rounded-xl bg-muted border-0" />
              )}
              {errors.client && <p className="text-xs text-destructive mt-1">{errors.client}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  readOnly={clientMode === "existing" && !!clientId}
                  placeholder="(11) 90000-0000"
                  className="mt-1.5 rounded-xl bg-muted border-0"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">E-mail</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={clientMode === "existing" && !!clientId}
                  placeholder="cliente@email.com"
                  className="mt-1.5 rounded-xl bg-muted border-0"
                />
              </div>
            </div>
          </section>

          {/* Bloco 2 — Oportunidade */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Oportunidade</h3>

            <div>
              <Label className="text-xs text-muted-foreground">Título *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="Ex: Renovação Auto"
                className="mt-1.5 rounded-xl bg-muted border-0"
              />
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
                <Label className="text-xs text-muted-foreground">Etapa inicial</Label>
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
                <Label className="text-xs text-muted-foreground">Valor estimado *</Label>
                <Input
                  inputMode="numeric"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value.replace(/\D/g, ""))}
                  onBlur={() => { if (valueNum > 0) setEstimatedValue(formatBRL(valueNum)); }}
                  onFocus={() => setEstimatedValue(String(valueNum || ""))}
                  placeholder="R$ 0"
                  className="mt-1.5 rounded-xl bg-muted border-0"
                />
                {errors.value && <p className="text-xs text-destructive mt-1">{errors.value}</p>}
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
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      disabled={(d) => { const t = new Date(); t.setHours(0,0,0,0); return d < t; }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
              </div>
            </div>
          </section>

          {/* Bloco 3 — Atribuição */}
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
          <Button
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={submit}
            disabled={!valid}
          >
            Criar oportunidade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
