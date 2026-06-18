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
import { team, formatBRL, formatDateShort, type Beneficiary, type Branch, type Insurer, type PolicyStatus } from "@/lib/mock/data";
import { useClientStore } from "@/lib/portfolio/clientStore";
import { usePolicyStore } from "@/lib/portfolio/policyStore";
import { useDocumentStore } from "@/lib/documents/documentStore";
import { BranchSpecificFields, maskPercentInput, parsePercent } from "./BranchSpecificFields";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; defaultClientName?: string };

const BRANCHES: Branch[] = ["Auto", "Vida", "Residencial", "Empresarial", "Saúde", "Consórcio"];
const INSURERS: Insurer[] = ["Porto Seguro", "Bradesco", "SulAmérica", "Allianz", "Mapfre"];
const STATUSES: { key: PolicyStatus; label: string }[] = [
  { key: "ativa", label: "Ativa" },
  { key: "pendente", label: "Pendente" },
  { key: "vencida", label: "Vencida" },
  { key: "cancelada", label: "Cancelada" },
];

const addYears = (d: Date, n: number) => {
  const r = new Date(d); r.setFullYear(r.getFullYear() + n); return r;
};

export function NewPolicyDialog({ open, onOpenChange, defaultClientName }: Props) {
  const { clients } = useClientStore();
  const { addPolicy } = usePolicyStore();
  const { ensurePolicyRoots } = useDocumentStore();

  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [branch, setBranch] = useState<Branch>("Auto");
  const [insurer, setInsurer] = useState<Insurer>("Porto Seguro");
  const [premium, setPremium] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addYears(new Date(), 1));
  const [status, setStatus] = useState<PolicyStatus>("ativa");
  const [assigneeId, setAssigneeId] = useState(team[0]?.id ?? "");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClientId(""); setClientName(""); setBranch("Auto"); setInsurer("Porto Seguro");
    setPremium(""); setStartDate(new Date()); setEndDate(addYears(new Date(), 1));
    setStatus("ativa"); setAssigneeId(team[0]?.id ?? ""); setTouched(false);
    if (defaultClientName) {
      const c = clients.find((x) => x.name === defaultClientName);
      if (c) { setClientId(c.id); setClientName(c.name); }
    }
  }, [open, defaultClientName, clients]);

  const selectClient = (id: string) => {
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setClientId(id); setClientName(c.name); setClientOpen(false);
  };

  const premiumNum = useMemo(() => Number(premium.replace(/\D/g, "")) || 0, [premium]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!clientId) e.client = "Selecione um cliente";
    if (premiumNum <= 0) e.premium = "Prêmio deve ser maior que zero";
    if (!startDate) e.startDate = "Selecione a data de início";
    if (!endDate) e.endDate = "Selecione a data de fim";
    if (startDate && endDate && endDate <= startDate) e.endDate = "Fim deve ser após início";
    return e;
  }, [clientId, premiumNum, startDate, endDate]);

  const valid = Object.keys(errors).length === 0;

  const submit = () => {
    setTouched(true);
    if (!valid || !startDate || !endDate) {
      toast.error("Revise os campos obrigatórios");
      return;
    }
    const created = addPolicy({
      clientName,
      branch,
      insurer,
      premium: premiumNum,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      status,
    });
    ensurePolicyRoots({
      policyId: created.id,
      policyNumber: created.number,
      branch: created.branch,
      clientName: created.clientName,
    });
    toast.success(`Apólice ${created.number} criada`);
    onOpenChange(false);
  };

  const showErr = (key: string) => touched && errors[key];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova apólice</DialogTitle></DialogHeader>

        <div className="space-y-5">
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
                        <CommandItem key={c.id} value={c.name} onSelect={() => selectClient(c.id)}>
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {showErr("client") && <p className="text-xs text-destructive mt-1">{errors.client}</p>}
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
              <Label className="text-xs text-muted-foreground">Seguradora *</Label>
              <Select value={insurer} onValueChange={(v) => setInsurer(v as Insurer)}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSURERS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Prêmio anual *</Label>
              <Input
                inputMode="numeric"
                value={premium}
                onChange={(e) => setPremium(e.target.value.replace(/\D/g, ""))}
                onBlur={() => { if (premiumNum > 0) setPremium(formatBRL(premiumNum)); }}
                onFocus={() => setPremium(String(premiumNum || ""))}
                placeholder="R$ 0"
                className="mt-1.5 rounded-xl bg-muted border-0"
              />
              {showErr("premium") && <p className="text-xs text-destructive mt-1">{errors.premium}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PolicyStatus)}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Início vigência *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("mt-1.5 w-full justify-start rounded-xl bg-muted border-0 font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {startDate ? formatDateShort(startDate.toISOString()) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => { setStartDate(d); if (d) setEndDate(addYears(d, 1)); }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {showErr("startDate") && <p className="text-xs text-destructive mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fim vigência *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("mt-1.5 w-full justify-start rounded-xl bg-muted border-0 font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {endDate ? formatDateShort(endDate.toISOString()) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {showErr("endDate") && <p className="text-xs text-destructive mt-1">{errors.endDate}</p>}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Vendedor</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>Criar apólice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
