import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon } from "lucide-react";
import { cn, parseMoneyInput, formatBRLDecimal } from "@/lib/utils";
import { team, formatBRL, formatDateShort, type Beneficiary, type Branch, type Insurer, type Policy, type PolicyStatus } from "@/lib/mock/data";
import { useClientStore } from "@/lib/portfolio/clientStore";
import { usePolicyStore } from "@/lib/portfolio/policyStore";
import { useDocumentStore } from "@/lib/documents/documentStore";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { BranchSpecificFields, maskPercentInput, parsePercent } from "./BranchSpecificFields";
import { useCommissionConfigStore } from "@/lib/financial/commissionConfigStore";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultClientName?: string;
  sourcePolicy?: Policy | null;
};

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

export function NewPolicyDialog({ open, onOpenChange, defaultClientName, sourcePolicy }: Props) {
  const isRenewal = !!sourcePolicy;
  const { clients } = useClientStore();
  const { addPolicy, renewPolicy } = usePolicyStore();
  const { ensurePolicyRoots } = useDocumentStore();
  const { generateForPolicy } = useCommissionStore();
  const { getConfig } = useCommissionConfigStore();

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

  // Extras: commission
  const [commissionStr, setCommissionStr] = useState("");
  const [autoScheme, setAutoScheme] = useState<"esgotamento" | "parcela">("esgotamento");
  const [autoInstallments, setAutoInstallments] = useState("10");
  // Saúde
  const [healthScheme, setHealthScheme] = useState<"agenciamento" | "vitalicio">("agenciamento");
  const [healthAnniversary, setHealthAnniversary] = useState("");
  const [anniversaryTouched, setAnniversaryTouched] = useState(false);
  const [healthInitialValue, setHealthInitialValue] = useState("");
  const [healthCategory, setHealthCategory] = useState("");
  const [healthCoparticipation, setHealthCoparticipation] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  // Consórcio
  const [consortiumGroup, setConsortiumGroup] = useState("");
  const [consortiumQuota, setConsortiumQuota] = useState("");
  const [consortiumType, setConsortiumType] = useState<"Imóvel" | "Auto" | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    if (sourcePolicy) {
      const src = sourcePolicy;
      const c = clients.find((x) => x.name === src.clientName);
      setClientId(c?.id ?? ""); setClientName(src.clientName);
      setBranch(src.branch); setInsurer(src.insurer);
      setPremium(formatBRLDecimal(src.premium));
      const newStart = new Date(src.endDate || src.startDate);
      setStartDate(newStart);
      setEndDate(addYears(newStart, 1));
      setStatus("ativa");
      setAssigneeId(src.assigneeId ?? team[0]?.id ?? "");
      setTouched(false);
      setCommissionStr(src.commissionPct != null ? String(src.commissionPct).replace(".", ",") : "");
      setAutoScheme(src.commissionScheme === "parcela" ? "parcela" : "esgotamento");
      setAutoInstallments(src.commissionInstallments ? String(src.commissionInstallments) : "10");
      setHealthScheme(src.commissionScheme === "vitalicio" ? "vitalicio" : "agenciamento");
      setHealthAnniversary(src.healthAnniversary ?? "");
      setAnniversaryTouched(false);
      setHealthInitialValue(src.healthInitialValue ? formatBRLDecimal(src.healthInitialValue) : "");
      setHealthCategory(src.healthCategory ?? "");
      setHealthCoparticipation(!!src.healthCoparticipation);
      setBeneficiaries(src.beneficiaries ?? []);
      setConsortiumGroup(src.consortiumGroup ?? "");
      setConsortiumQuota(src.consortiumQuota ?? "");
      setConsortiumType(src.consortiumType);
      return;
    }
    setClientId(""); setClientName(""); setBranch("Auto"); setInsurer("Porto Seguro");
    setPremium(""); setStartDate(new Date()); setEndDate(addYears(new Date(), 1));
    setStatus("ativa"); setAssigneeId(team[0]?.id ?? ""); setTouched(false);
    setCommissionStr(""); setAutoScheme("esgotamento"); setAutoInstallments("10");
    setHealthScheme("agenciamento");
    setHealthAnniversary(""); setAnniversaryTouched(false); setHealthInitialValue("");
    setHealthCategory(""); setHealthCoparticipation(false); setBeneficiaries([]);
    setConsortiumGroup(""); setConsortiumQuota(""); setConsortiumType(undefined);
    if (defaultClientName) {
      const c = clients.find((x) => x.name === defaultClientName);
      if (c) { setClientId(c.id); setClientName(c.name); }
    }
  }, [open, defaultClientName, clients, sourcePolicy]);

  const selectClient = (id: string) => {
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setClientId(id); setClientName(c.name); setClientOpen(false);
  };

  const premiumNum = useMemo(() => parseMoneyInput(premium), [premium]);

  const commissionPct = useMemo(() => parsePercent(commissionStr), [commissionStr]);
  const commissionValue = useMemo(() => (premiumNum * commissionPct) / 100, [premiumNum, commissionPct]);

  const endDateRequired = !(branch === "Saúde" && status !== "cancelada");

  // Limites por seguradora para Parcelado/Adiantamento (Seguros)
  const autoConfig = useMemo(() => getConfig(insurer, "auto"), [getConfig, insurer]);
  const installmentsNum = Math.max(1, Number(autoInstallments) || 1);
  const minParcelado = autoConfig.parceladoMinInstallments ?? 5;
  const maxAdiantamento = autoConfig.adiantamentoMaxInstallments ?? 4;
  const parceladoAllowed = installmentsNum >= minParcelado;
  const adiantamentoAllowed = installmentsNum <= maxAdiantamento;

  // Se a seleção atual virar inválida, alterna para a outra opção (quando possível)
  useEffect(() => {
    if (autoScheme === "parcela" && !parceladoAllowed && adiantamentoAllowed) {
      setAutoScheme("esgotamento");
    } else if (autoScheme === "esgotamento" && !adiantamentoAllowed && parceladoAllowed) {
      setAutoScheme("parcela");
    }
  }, [autoScheme, parceladoAllowed, adiantamentoAllowed]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!clientId) e.client = "Selecione um cliente";
    if (premiumNum <= 0) e.premium = "Prêmio deve ser maior que zero";
    if (!startDate) e.startDate = "Selecione a data de início";
    if (endDateRequired && !endDate) e.endDate = "Selecione a data de fim";
    if (endDateRequired && startDate && endDate && endDate <= startDate) e.endDate = "Fim deve ser após início";
    return e;
  }, [clientId, premiumNum, startDate, endDate, endDateRequired]);

  const valid = Object.keys(errors).length === 0;

  const submit = () => {
    setTouched(true);
    if (!valid || !startDate) {
      toast.error("Revise os campos obrigatórios");
      return;
    }
    const healthInitialNum = parseMoneyInput(healthInitialValue);
    const isAutoLike = !["Saúde", "Consórcio"].includes(branch);
    const payload = {
      clientName,
      branch,
      insurer,
      premium: premiumNum,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate ? endDate.toISOString().slice(0, 10) : "",
      status,
      assigneeId: assigneeId || undefined,
      commissionPct: commissionPct || undefined,
      ...(isAutoLike && {
        commissionScheme: autoScheme,
        commissionInstallments: autoScheme === "parcela" ? Math.max(1, Number(autoInstallments) || 1) : undefined,
      }),
      ...(branch === "Saúde" && {
        healthAnniversary: healthAnniversary || undefined,
        healthInitialValue: healthInitialNum || undefined,
        healthCategory: healthCategory || undefined,
        healthCoparticipation,
        beneficiaries: beneficiaries.length ? beneficiaries : undefined,
        commissionScheme: healthScheme,
      }),
      ...(branch === "Consórcio" && {
        consortiumGroup: consortiumGroup || undefined,
        consortiumQuota: consortiumQuota || undefined,
        consortiumType,
        commissionScheme: "unica" as const,
      }),
    };
    const created = isRenewal && sourcePolicy
      ? renewPolicy(sourcePolicy.id, payload)
      : addPolicy(payload);
    ensurePolicyRoots({
      policyId: created.id,
      policyNumber: created.number,
      branch: created.branch,
      clientName: created.clientName,
      startDate: created.startDate,
    });
    const gerados = generateForPolicy(created);
    const baseMsg = isRenewal ? `Renovação ${created.number} criada` : `Apólice ${created.number} criada`;
    toast.success(
      gerados.length > 0
        ? `${baseMsg} · ${gerados.length} parcela(s) de comissão geradas`
        : baseMsg,
    );
    onOpenChange(false);
  };


  const showErr = (key: string) => touched && errors[key];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isRenewal ? "Renovar apólice" : "Nova apólice"}</DialogTitle>
          {isRenewal && sourcePolicy && (
            <DialogDescription>
              Renovando <span className="font-mono">{sourcePolicy.number}</span> — {sourcePolicy.clientName}
            </DialogDescription>
          )}
        </DialogHeader>

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
                  <CommandList className="max-h-[280px] overflow-y-auto">
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
              <Label className="text-xs text-muted-foreground">{branch === "Saúde" ? "Prêmio mensal *" : "Prêmio anual *"}</Label>
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
                    onSelect={(d) => {
                      setStartDate(d);
                      if (d && branch !== "Saúde") setEndDate(addYears(d, 1));
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
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
              <Input
                value={formatBRL(commissionValue)}
                disabled
                className="mt-1.5 rounded-xl bg-muted border-0"
              />
            </div>
          </div>

          {!["Saúde", "Consórcio"].includes(branch) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Número de parcelas</Label>
                <Input
                  inputMode="numeric"
                  value={autoInstallments}
                  onChange={(e) => setAutoInstallments(e.target.value.replace(/\D/g, ""))}
                  placeholder="10"
                  className="mt-1.5 rounded-xl bg-muted border-0"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tipo de comissão</Label>
                <Select value={autoScheme} onValueChange={(v) => setAutoScheme(v as typeof autoScheme)}>
                  <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="esgotamento" disabled={!adiantamentoAllowed}>
                      Adiantamento{!adiantamentoAllowed ? ` (máx ${maxAdiantamento} parcelas)` : ""}
                    </SelectItem>
                    <SelectItem value="parcela" disabled={!parceladoAllowed}>
                      Parcelado{!parceladoAllowed ? ` (mín ${minParcelado} parcelas)` : ""}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Adiantamento até {maxAdiantamento} · Parcelado a partir de {minParcelado}.
                </p>
              </div>
            </div>
          )}
          {branch === "Saúde" && (
            <div>
              <Label className="text-xs text-muted-foreground">Tipo de comissão</Label>
              <Select value={healthScheme} onValueChange={(v) => setHealthScheme(v as typeof healthScheme)}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agenciamento">Agenciamento + recorrência</SelectItem>
                  <SelectItem value="vitalicio">Vitalício</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {healthScheme === "vitalicio"
                  ? "Recorrência mensal a partir da parcela definida nas configurações."
                  : "Parcelas iniciais geradas no cadastro; recorrência mensal aparece mês a mês."}
              </p>
            </div>
          )}
          {branch === "Consórcio" && (
            <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              Modelo provisório: 1 comissão única (% sobre o valor do crédito).
            </div>
          )}

        </div>


        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>{isRenewal ? "Confirmar renovação" : "Criar apólice"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
