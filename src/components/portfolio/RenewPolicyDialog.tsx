import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn, parseMoneyInput, formatBRLDecimal } from "@/lib/utils";
import { formatDateShort, type Branch, type Insurer, type Policy, type PolicyStatus } from "@/lib/mock/data";
import { usePolicyStore } from "@/lib/portfolio/policyStore";
import { useDocumentStore } from "@/lib/documents/documentStore";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { PolicyTaxOverrideFields } from "./PolicyTaxOverrideFields";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sourcePolicy: Policy | null;
};

const BRANCHES: Branch[] = ["Auto", "Vida", "Residencial", "Empresarial", "Saúde"];
const INSURERS: Insurer[] = ["Porto Seguro", "Bradesco", "SulAmérica", "Allianz", "Mapfre"];
const STATUSES: { key: PolicyStatus; label: string }[] = [
  { key: "ativa", label: "Ativa" },
  { key: "pendente", label: "Pendente" },
];

const addYears = (d: Date, n: number) => {
  const r = new Date(d); r.setFullYear(r.getFullYear() + n); return r;
};

export function RenewPolicyDialog({ open, onOpenChange, sourcePolicy }: Props) {
  const { renewPolicy } = usePolicyStore();
  const { ensurePolicyRoots } = useDocumentStore();
  const { generateForPolicy } = useCommissionStore();

  const [branch, setBranch] = useState<Branch>("Auto");
  const [insurer, setInsurer] = useState<Insurer>("Porto Seguro");
  const [premium, setPremium] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addYears(new Date(), 1));
  const [status, setStatus] = useState<PolicyStatus>("ativa");
  const [touched, setTouched] = useState(false);
  const [comissaoLiquida, setComissaoLiquida] = useState<boolean | undefined>(undefined);
  const [taxaImposto, setTaxaImposto] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!open || !sourcePolicy) return;
    setBranch(sourcePolicy.branch);
    setInsurer(sourcePolicy.insurer);
    setPremium(formatBRLDecimal(sourcePolicy.premium));
    const newStart = new Date(sourcePolicy.endDate);
    setStartDate(newStart);
    setEndDate(addYears(newStart, 1));
    setStatus("ativa");
    setTouched(false);
    setComissaoLiquida(sourcePolicy.comissaoLiquida);
    setTaxaImposto(sourcePolicy.taxaImposto);
  }, [open, sourcePolicy]);

  const premiumNum = useMemo(() => parseMoneyInput(premium), [premium]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (premiumNum <= 0) e.premium = "Prêmio deve ser maior que zero";
    if (!startDate) e.startDate = "Selecione a data de início";
    if (!endDate) e.endDate = "Selecione a data de fim";
    if (startDate && endDate && endDate <= startDate) e.endDate = "Fim deve ser após início";
    return e;
  }, [premiumNum, startDate, endDate]);

  const valid = Object.keys(errors).length === 0;

  const submit = () => {
    setTouched(true);
    if (!sourcePolicy || !valid || !startDate || !endDate) {
      toast.error("Revise os campos obrigatórios");
      return;
    }
    const created = renewPolicy(sourcePolicy.id, {
      clientName: sourcePolicy.clientName,
      branch,
      insurer,
      premium: premiumNum,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      status,
      comissaoLiquida,
      taxaImposto,
    });
    ensurePolicyRoots({
      policyId: created.id,
      policyNumber: created.number,
      branch: created.branch,
      clientName: created.clientName,
      startDate: created.startDate,
    });
    generateForPolicy(created);
    toast.success(`Renovação ${created.number} criada`);
    onOpenChange(false);
  };

  const showErr = (key: string) => touched && errors[key];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Renovar apólice</DialogTitle>
          {sourcePolicy && (
            <DialogDescription>
              Renovando <span className="font-mono">{sourcePolicy.number}</span> — {sourcePolicy.clientName}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
            Uma nova apólice será criada e vinculada à anterior. A apólice atual será marcada como <span className="font-medium">renovada</span>.
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
                inputMode="decimal"
                value={premium}
                onChange={(e) => setPremium(e.target.value.replace(/[^\d.,]/g, ""))}
                onBlur={() => { if (premiumNum > 0) setPremium(formatBRLDecimal(premiumNum)); }}
                onFocus={() => setPremium(premiumNum ? String(premiumNum).replace(".", ",") : "")}
                placeholder="R$ 0,00"
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

          <PolicyTaxOverrideFields
            branch={branch}
            insurer={insurer}
            comissaoLiquida={comissaoLiquida}
            setComissaoLiquida={setComissaoLiquida}
            taxaImposto={taxaImposto}
            setTaxaImposto={setTaxaImposto}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>Confirmar renovação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
