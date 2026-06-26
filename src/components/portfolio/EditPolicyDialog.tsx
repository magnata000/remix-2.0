import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL, formatBRLInt, formatDateShort, type Beneficiary, type Branch, type Insurer, type Policy, type PolicyStatus } from "@/lib/mock/data";
import { usePolicyStore } from "@/lib/portfolio/policyStore";
import { useCommissionConfigStore } from "@/lib/financial/commissionConfigStore";
import { BranchSpecificFields, maskPercentInput, parsePercent } from "./BranchSpecificFields";
import { PolicyTaxOverrideFields } from "./PolicyTaxOverrideFields";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; policy: Policy | null };

const BRANCHES: Branch[] = ["Auto", "Vida", "Residencial", "Empresarial", "Saúde", "Consórcio"];
const INSURERS: Insurer[] = ["Porto Seguro", "Bradesco", "SulAmérica", "Allianz", "Mapfre"];
const BASE_STATUSES: { key: PolicyStatus; label: string }[] = [
  { key: "ativa", label: "Ativa" },
  { key: "pendente", label: "Pendente" },
  { key: "vencida", label: "Vencida" },
  { key: "cancelada", label: "Cancelada" },
];

export function EditPolicyDialog({ open, onOpenChange, policy }: Props) {
  const { updatePolicy } = usePolicyStore();

  const [branch, setBranch] = useState<Branch>("Auto");
  const [insurer, setInsurer] = useState<Insurer>("Porto Seguro");
  const [premium, setPremium] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<PolicyStatus>("ativa");
  const [touched, setTouched] = useState(false);

  const [commissionStr, setCommissionStr] = useState("");
  const [healthAnniversary, setHealthAnniversary] = useState("");
  const [anniversaryTouched, setAnniversaryTouched] = useState(false);
  const [healthInitialValue, setHealthInitialValue] = useState("");
  const [healthCategory, setHealthCategory] = useState("");
  const [healthCoparticipation, setHealthCoparticipation] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [consortiumGroup, setConsortiumGroup] = useState("");
  const [consortiumQuota, setConsortiumQuota] = useState("");
  const [consortiumType, setConsortiumType] = useState<"Imóvel" | "Auto" | undefined>(undefined);
  const [comissaoLiquida, setComissaoLiquida] = useState<boolean | undefined>(undefined);
  const [taxaImposto, setTaxaImposto] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (open && policy) {
      setBranch(policy.branch);
      setInsurer(policy.insurer);
      setPremium(formatBRLInt(policy.premium));
      setStartDate(policy.startDate ? new Date(policy.startDate) : undefined);
      setEndDate(policy.endDate ? new Date(policy.endDate) : undefined);
      setStatus(policy.status);
      setTouched(false);
      setCommissionStr(policy.commissionPct != null ? String(policy.commissionPct).replace(".", ",") : "");
      setHealthAnniversary(policy.healthAnniversary ?? "");
      setAnniversaryTouched(!!policy.healthAnniversary);
      setHealthInitialValue(policy.healthInitialValue ? formatBRLInt(policy.healthInitialValue) : "");
      setHealthCategory(policy.healthCategory ?? "");
      setHealthCoparticipation(!!policy.healthCoparticipation);
      setBeneficiaries(policy.beneficiaries ?? []);
      setConsortiumGroup(policy.consortiumGroup ?? "");
      setConsortiumQuota(policy.consortiumQuota ?? "");
      setConsortiumType(policy.consortiumType);
      setComissaoLiquida(policy.comissaoLiquida);
      setTaxaImposto(policy.taxaImposto);
    }
  }, [open, policy]);

  const premiumNum = useMemo(() => Number(premium.replace(/\D/g, "")) || 0, [premium]);
  const commissionPct = useMemo(() => parsePercent(commissionStr), [commissionStr]);
  const commissionValue = useMemo(() => (premiumNum * commissionPct) / 100, [premiumNum, commissionPct]);

  const endDateRequired = !(branch === "Saúde" && status !== "cancelada");

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (premiumNum <= 0) e.premium = "Prêmio deve ser maior que zero";
    if (!startDate) e.startDate = "Selecione a data de início";
    if (endDateRequired && !endDate) e.endDate = "Selecione a data de fim";
    if (endDateRequired && startDate && endDate && endDate <= startDate) e.endDate = "Fim deve ser após início";
    return e;
  }, [premiumNum, startDate, endDate, endDateRequired]);

  const valid = Object.keys(errors).length === 0;

  if (!policy) return null;

  const canSetRenovada = !!policy.renewedToId;
  const statuses = canSetRenovada
    ? [...BASE_STATUSES, { key: "renovada" as PolicyStatus, label: "Renovada" }]
    : BASE_STATUSES;

  const submit = () => {
    setTouched(true);
    if (!valid || !startDate) {
      toast.error("Revise os campos obrigatórios");
      return;
    }
    const healthInitialNum = Number(healthInitialValue.replace(/\D/g, "")) || 0;
    updatePolicy(policy.id, {
      clientName: policy.clientName,
      branch,
      insurer,
      premium: premiumNum,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate ? endDate.toISOString().slice(0, 10) : "",
      status,
      assigneeId: policy.assigneeId,
      commissionPct: commissionPct || undefined,
      comissaoLiquida,
      taxaImposto,
      healthAnniversary: branch === "Saúde" ? (healthAnniversary || undefined) : undefined,
      healthInitialValue: branch === "Saúde" ? (healthInitialNum || undefined) : undefined,
      healthCategory: branch === "Saúde" ? (healthCategory || undefined) : undefined,
      healthCoparticipation: branch === "Saúde" ? healthCoparticipation : undefined,
      beneficiaries: branch === "Saúde" && beneficiaries.length ? beneficiaries : undefined,
      consortiumGroup: branch === "Consórcio" ? (consortiumGroup || undefined) : undefined,
      consortiumQuota: branch === "Consórcio" ? (consortiumQuota || undefined) : undefined,
      consortiumType: branch === "Consórcio" ? consortiumType : undefined,
    });
    toast.success(`Apólice ${policy.number} atualizada`);
    onOpenChange(false);
  };

  const showErr = (key: string) => touched && errors[key];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar apólice</DialogTitle></DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Número</Label>
              <Input value={policy.number} disabled className="mt-1.5 rounded-xl bg-muted border-0 font-mono" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Input value={policy.clientName} disabled className="mt-1.5 rounded-xl bg-muted border-0" />
            </div>

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
              <Label className="text-xs text-muted-foreground">{branch === "Saúde" ? "Prêmio mensal *" : "Prêmio anual *"}</Label>
              <Input
                inputMode="numeric"
                value={premium}
                onChange={(e) => setPremium(e.target.value.replace(/\D/g, ""))}
                onBlur={() => { if (premiumNum > 0) setPremium(formatBRLInt(premiumNum)); }}
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
                  {statuses.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
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
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              {showErr("startDate") && <p className="text-xs text-destructive mt-1">{errors.startDate}</p>}
            </div>
            {endDateRequired && (
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
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
                {showErr("endDate") && <p className="text-xs text-destructive mt-1">{errors.endDate}</p>}
              </div>
            )}
          </div>

          <BranchSpecificFields
            branch={branch}
            startDate={startDate}
            healthAnniversary={healthAnniversary}
            setHealthAnniversary={setHealthAnniversary}
            anniversaryTouched={anniversaryTouched}
            setAnniversaryTouched={setAnniversaryTouched}
            healthInitialValue={healthInitialValue}
            setHealthInitialValue={setHealthInitialValue}
            healthCategory={healthCategory}
            setHealthCategory={setHealthCategory}
            healthCoparticipation={healthCoparticipation}
            setHealthCoparticipation={setHealthCoparticipation}
            beneficiaries={beneficiaries}
            setBeneficiaries={setBeneficiaries}
            consortiumGroup={consortiumGroup}
            setConsortiumGroup={setConsortiumGroup}
            consortiumQuota={consortiumQuota}
            setConsortiumQuota={setConsortiumQuota}
            consortiumType={consortiumType}
            setConsortiumType={setConsortiumType}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Comissão (%)</Label>
              <Input
                inputMode="decimal"
                value={commissionStr}
                onChange={(e) => setCommissionStr(maskPercentInput(e.target.value))}
                placeholder="0"
                className="mt-1.5 rounded-xl bg-muted border-0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Valor da comissão</Label>
              <Input value={formatBRL(commissionValue)} disabled className="mt-1.5 rounded-xl bg-muted border-0" />
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
          <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>Salvar alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
