import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CalendarIcon } from "lucide-react";
import { cn, parseMoneyInput, formatBRLDecimal } from "@/lib/utils";
import { annivToISO, isoToDdmm } from "@/lib/portfolio/healthAnniversary";

import {
  formatBRL,
  formatDateShort,
  type Beneficiary,
  type Branch,
  type Insurer,
  type Policy,
  type PolicyStatus,
} from "@/lib/mock/data";
import { useTeam } from "@/lib/team/teamStore";
import { useRole } from "@/lib/auth/roleStore";
import { useClients } from "@/lib/portfolio/clientStore";
import { usePolicies } from "@/lib/portfolio/policyStore";
import { useDocumentStore } from "@/lib/documents/documentStore";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { BranchSpecificFields, maskPercentInput, parsePercent } from "./BranchSpecificFields";
import { useCommissionConfigStore } from "@/lib/financial/commissionConfigStore";
import { getInsurersForBranch } from "@/lib/insurers/insurerStore";
import { toast } from "sonner";
import { BranchCombobox } from "./BranchCombobox";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCommissionModels } from "@/lib/settings/settings.functions";
import { createPolicyCommission } from "@/lib/financial/financeiro.functions";
import { listBranches, listInsurers } from "@/lib/portfolio/portfolio.functions";

export type PolicyPrefill = {
  clientName?: string;
  insurer?: string;
  policyNumber?: string;
  premium?: number;
  startDate?: string;
  endDate?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultClientName?: string;
  sourcePolicy?: Policy | null;
  prefill?: PolicyPrefill | null;
};

const STATUSES: { key: PolicyStatus; label: string }[] = [
  { key: "ativa", label: "Ativa" },
  { key: "pendente", label: "Pendente" },
  { key: "vencida", label: "Vencida" },
  { key: "cancelada", label: "Cancelada" },
];

const addYears = (d: Date, n: number) => {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
};

export function NewPolicyDialog({
  open,
  onOpenChange,
  defaultClientName,
  sourcePolicy,
  prefill,
}: Props) {
  const isRenewal = !!sourcePolicy;
  const { clients } = useClients();
  const { addPolicy, renewPolicy } = usePolicies();
  const { refresh: refreshDocuments } = useDocumentStore();
  const queryClient = useQueryClient();
  const { getConfig } = useCommissionConfigStore();
  const { members: team } = useTeam();
  const { userId, appRole, isAdmin } = useRole();

  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [branch, setBranch] = useState<Branch>("Auto");
  const [insurer, setInsurer] = useState<Insurer>("Porto Seguro");
  const [premium, setPremium] = useState("");
  const [premioLiquido, setPremioLiquido] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addYears(new Date(), 1));
  const [status, setStatus] = useState<PolicyStatus>("ativa");
  const [assigneeId, setAssigneeId] = useState(userId);
  const [touched, setTouched] = useState(false);

  // Apenas admin e pós-venda podem escolher qualquer vendedor; vendedor só se atribui.
  const assignable = useMemo(
    () => (isAdmin || appRole === "pos_venda" ? team : team.filter((m) => m.id === userId)),
    [team, isAdmin, appRole, userId],
  );

  // Extras: commission
  const [commissionStr, setCommissionStr] = useState("");

  // Modelo Seguradora + Ramo (Configurações) pré-carrega o % como ponto de partida editável.
  const modelsFn = useServerFn(listCommissionModels);
  const createCommissionFn = useServerFn(createPolicyCommission);
  const branchListFn = useServerFn(listBranches);
  const insurerListFn = useServerFn(listInsurers);
  const { data: commissionModels = [] } = useQuery({ queryKey: ["commission-models"], queryFn: () => modelsFn(), enabled: open });
  const { data: branchCatalog = [] } = useQuery({ queryKey: ["branches"], queryFn: () => branchListFn(), enabled: open });
  const { data: insurerCatalog = [] } = useQuery({ queryKey: ["insurers"], queryFn: () => insurerListFn(), enabled: open });
  useEffect(() => {
    const bId = branchCatalog.find((b) => b.name === branch)?.id;
    const iId = insurerCatalog.find((i) => i.name === insurer)?.id;
    const m = commissionModels.find((x) => x.branchId === bId && x.insurerId === iId);
    if (m) setCommissionStr(String(m.percentualPadrao).replace(".", ","));
  }, [branch, insurer, commissionModels, branchCatalog, insurerCatalog]);
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

  const availableInsurers = useMemo(() => [...getInsurersForBranch(branch)], [branch]);

  useEffect(() => {
    if (!availableInsurers.includes(insurer)) {
      setInsurer(availableInsurers[0]);
    }
  }, [availableInsurers, insurer]);

  useEffect(() => {
    if (!open) return;

    if (sourcePolicy) {
      const src = sourcePolicy;
      const c = clients.find((x) => x.name === src.clientName);
      setClientId(c?.id ?? "");
      setClientName(src.clientName);
      setBranch(src.branch);
      setInsurer(src.insurer);
      setPremium(formatBRLDecimal(src.premium));
      setPremioLiquido(src.premioLiquido ? formatBRLDecimal(src.premioLiquido) : "");
      const newStart = new Date(src.endDate || src.startDate);
      setStartDate(newStart);
      setEndDate(addYears(newStart, 1));
      setStatus("ativa");
      setAssigneeId(src.assigneeId ?? userId);
      setTouched(false);
      setCommissionStr(
        src.commissionPct != null ? String(src.commissionPct).replace(".", ",") : "",
      );
      setHealthScheme(src.commissionScheme === "vitalicio" ? "vitalicio" : "agenciamento");
      setHealthAnniversary(isoToDdmm(src.healthAnniversary));
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
    setClientId("");
    setClientName("");
    setBranch("Auto");
    setInsurer("Porto Seguro");
    setPremium("");
    setPremioLiquido("");
    setStartDate(new Date());
    setEndDate(addYears(new Date(), 1));
    setStatus("ativa");
    setAssigneeId(userId);
    setTouched(false);
    setCommissionStr("");
    setHealthScheme("agenciamento");
    setHealthAnniversary("");
    setAnniversaryTouched(false);
    setHealthInitialValue("");
    setHealthCategory("");
    setHealthCoparticipation(false);
    setBeneficiaries([]);
    setConsortiumGroup("");
    setConsortiumQuota("");
    setConsortiumType(undefined);
    if (defaultClientName) {
      const c = clients.find((x) => x.name === defaultClientName);
      if (c) {
        setClientId(c.id);
        setClientName(c.name);
      }
    }
    if (prefill) {
      if (prefill.clientName) {
        const c = clients.find((x) => x.name.toLowerCase() === prefill.clientName!.toLowerCase());
        if (c) {
          setClientId(c.id);
          setClientName(c.name);
        } else {
          setClientName(prefill.clientName);
        }
      }
      if (prefill.insurer && (availableInsurers as string[]).includes(prefill.insurer)) {
        setInsurer(prefill.insurer as Insurer);
      }

      if (prefill.premium && prefill.premium > 0) {
        setPremium(formatBRLDecimal(prefill.premium));
      }
      if (prefill.startDate) {
        const d = new Date(prefill.startDate);
        if (!isNaN(d.getTime())) {
          setStartDate(d);
          if (!prefill.endDate) setEndDate(addYears(d, 1));
        }
      }
      if (prefill.endDate) {
        const d = new Date(prefill.endDate);
        if (!isNaN(d.getTime())) setEndDate(d);
      }
    }
  }, [open, defaultClientName, clients, sourcePolicy, prefill]);

  const selectClient = (id: string) => {
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setClientId(id);
    setClientName(c.name);
    setClientOpen(false);
  };

  const premiumNum = useMemo(() => parseMoneyInput(premium), [premium]);
  const liquidoNum = useMemo(() => parseMoneyInput(premioLiquido), [premioLiquido]);

  const commissionPct = useMemo(() => parsePercent(commissionStr), [commissionStr]);
  const commissionValue = useMemo(
    () => (liquidoNum * commissionPct) / 100,
    [liquidoNum, commissionPct],
  );

  const endDateRequired = !(branch === "Saúde" && status !== "cancelada");

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!clientId) e.client = "Selecione um cliente";
    if (premiumNum <= 0) e.premium = "Prêmio deve ser maior que zero";
    if (branch !== "Saúde" && liquidoNum <= 0)
      e.premioLiquido = "Prêmio líquido deve ser maior que zero";
    if (branch !== "Saúde" && liquidoNum > premiumNum && premiumNum > 0)
      e.premioLiquido = "Prêmio líquido não pode ser maior que o total";
    if (!startDate) e.startDate = "Selecione a data de início";
    if (endDateRequired && !endDate) e.endDate = "Selecione a data de fim";
    if (endDateRequired && startDate && endDate && endDate <= startDate)
      e.endDate = "Fim deve ser após início";
    return e;
  }, [clientId, premiumNum, liquidoNum, branch, startDate, endDate, endDateRequired]);

  const valid = Object.keys(errors).length === 0;

  const submit = async () => {
    setTouched(true);
    if (!valid || !startDate) {
      toast.error("Revise os campos obrigatórios");
      return;
    }
    if (branch === "Saúde") {
      const invalid = beneficiaries.find((b) => !b.name.trim() || !b.birthDate);
      if (invalid) {
        toast.error("Informe nome e data de nascimento de todos os beneficiários");
        return;
      }
    }
    const healthInitialNum = parseMoneyInput(healthInitialValue);
    const payload = {
      clientName,
      branch,
      insurer,
      premium: premiumNum,
      premioLiquido: liquidoNum || undefined,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate ? endDate.toISOString().slice(0, 10) : "",
      status,
      assigneeId: assigneeId || undefined,
      commissionPct: commissionPct || undefined,
      ...(branch === "Saúde" && {
        healthAnniversary: annivToISO(healthAnniversary, startDate),
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
    try {
      const created =
        isRenewal && sourcePolicy
          ? await renewPolicy(sourcePolicy.id, payload)
          : await addPolicy(payload);
      refreshDocuments();
      const baseMsg = isRenewal
        ? `Renovação ${created.number} criada`
        : `Apólice ${created.number} criada`;
      let extra = "";
      // Fluxo flexível (todos os ramos, só para apólices criadas aqui):
      // comissão prevista única; recebimentos parciais na aba Comissões.
      const base = branch === "Saúde" ? liquidoNum || premiumNum : liquidoNum;
      if (commissionPct > 0 && base > 0) {
        try {
          await createCommissionFn({
            data: {
              policyId: created.id,
              baseCalculo: base,
              percentual: commissionPct,
              modelo: "adiantamento",
              parcelas: 1,
            },
          });
          queryClient.invalidateQueries({ queryKey: ["finance-commissions"] });
          extra = " · comissão enviada ao Financeiro";
        } catch (e) {
          toast.error(
            `Apólice salva, mas a comissão não foi gerada: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
      toast.success(baseMsg + extra);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Não foi possível salvar a apólice: ${msg}`);
    }
  };

  const showErr = (key: string) => touched && errors[key];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isRenewal ? "Renovar apólice" : "Nova apólice"}</DialogTitle>
          {isRenewal && sourcePolicy && (
            <DialogDescription>
              Renovando <span className="font-mono">{sourcePolicy.number}</span> —{" "}
              {sourcePolicy.clientName}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-xs text-muted-foreground">Cliente *</Label>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "mt-1.5 w-full justify-start rounded-xl bg-muted border-0 font-normal",
                    !clientName && "text-muted-foreground",
                  )}
                >
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
              <BranchCombobox value={branch} onChange={(v) => setBranch(v as Branch)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Seguradora *</Label>
              <Select value={insurer} onValueChange={(v) => setInsurer(v as Insurer)}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableInsurers.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {branch === "Saúde" ? "Prêmio mensal *" : "Prêmio Total *"}
              </Label>
              <Input
                inputMode="decimal"
                value={premium}
                onChange={(e) => setPremium(e.target.value.replace(/[^\d.,]/g, ""))}
                onBlur={() => {
                  if (premiumNum > 0) setPremium(formatBRLDecimal(premiumNum));
                }}
                onFocus={() => setPremium(premiumNum ? String(premiumNum).replace(".", ",") : "")}
                placeholder="R$ 0,00"
                className="mt-1.5 rounded-xl bg-muted border-0"
              />
              {showErr("premium") && (
                <p className="text-xs text-destructive mt-1">{errors.premium}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Prêmio Líquido *</Label>
              <Input
                inputMode="decimal"
                value={premioLiquido}
                onChange={(e) => setPremioLiquido(e.target.value.replace(/[^\d.,]/g, ""))}
                onBlur={() => {
                  if (liquidoNum > 0) setPremioLiquido(formatBRLDecimal(liquidoNum));
                }}
                onFocus={() =>
                  setPremioLiquido(liquidoNum ? String(liquidoNum).replace(".", ",") : "")
                }
                placeholder="R$ 0,00"
                className="mt-1.5 rounded-xl bg-muted border-0"
              />
              {showErr("premioLiquido") && (
                <p className="text-xs text-destructive mt-1">{errors.premioLiquido}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PolicyStatus)}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Início vigência *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "mt-1.5 w-full justify-start rounded-xl bg-muted border-0 font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                  >
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
              {showErr("startDate") && (
                <p className="text-xs text-destructive mt-1">{errors.startDate}</p>
              )}
            </div>
            {endDateRequired && (
              <div>
                <Label className="text-xs text-muted-foreground">Fim vigência *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "mt-1.5 w-full justify-start rounded-xl bg-muted border-0 font-normal",
                        !endDate && "text-muted-foreground",
                      )}
                    >
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
                {showErr("endDate") && (
                  <p className="text-xs text-destructive mt-1">{errors.endDate}</p>
                )}
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
              <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignable.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
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

          {branch === "Saúde" && (
            <div>
              <Label className="text-xs text-muted-foreground">Tipo de comissão</Label>
              <Select
                value={healthScheme}
                onValueChange={(v) => setHealthScheme(v as typeof healthScheme)}
              >
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                  <SelectValue />
                </SelectTrigger>
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
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={submit}
          >
            {isRenewal ? "Confirmar renovação" : "Criar apólice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
