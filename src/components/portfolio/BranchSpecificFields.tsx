import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL, formatDateShort, type Beneficiary, type BeneficiaryTitle, type Branch } from "@/lib/mock/data";
import { parseMoneyInput, formatBRLDecimal } from "@/lib/utils";

const TITLE_OPTIONS: { key: BeneficiaryTitle; label: string }[] = [
  { key: "titular", label: "Titular" },
  { key: "conjuge", label: "Cônjuge" },
  { key: "filho", label: "Filho(a)" },
  { key: "pai_mae", label: "Pai/Mãe" },
  { key: "irmao", label: "Irmão(ã)" },
  { key: "parente", label: "Parente" },
  { key: "outro", label: "Outro" },
];

const maskCPF = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const calcAge = (iso: string): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / 31557600000);
  return age >= 0 ? age : null;
};

type Props = {
  branch: Branch;
  startDate: Date | undefined;
  // Saúde
  healthAnniversary: string;
  setHealthAnniversary: (v: string) => void;
  anniversaryTouched: boolean;
  setAnniversaryTouched: (v: boolean) => void;
  healthInitialValue: string;
  setHealthInitialValue: (v: string) => void;
  healthCategory: string;
  setHealthCategory: (v: string) => void;
  healthCoparticipation: boolean;
  setHealthCoparticipation: (v: boolean) => void;
  beneficiaries: Beneficiary[];
  setBeneficiaries: (b: Beneficiary[]) => void;
  // Consórcio
  consortiumGroup: string;
  setConsortiumGroup: (v: string) => void;
  consortiumQuota: string;
  setConsortiumQuota: (v: string) => void;
  consortiumType?: "Imóvel" | "Auto";
  setConsortiumType?: (v: "Imóvel" | "Auto" | undefined) => void;
};

export function BranchSpecificFields(p: Props) {
  // auto-derive anniversary from startDate while user hasn't touched it
  useEffect(() => {
    if (p.branch !== "Saúde") return;
    if (p.anniversaryTouched) return;
    if (!p.startDate) return;
    const dd = String(p.startDate.getDate()).padStart(2, "0");
    const mm = String(p.startDate.getMonth() + 1).padStart(2, "0");
    p.setHealthAnniversary(`${dd}/${mm}`);
  }, [p.branch, p.startDate, p.anniversaryTouched]); // eslint-disable-line react-hooks/exhaustive-deps

  if (p.branch === "Saúde") {
    const initialNum = parseMoneyInput(p.healthInitialValue);
    return (
      <div className="space-y-4 rounded-xl border border-border/60 p-4">
        <p className="text-xs font-medium text-muted-foreground">Detalhes do plano de saúde</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Valor inicial (contratação)</Label>
            <Input
              inputMode="decimal"
              value={p.healthInitialValue}
              onChange={(e) => p.setHealthInitialValue(e.target.value.replace(/[^\d.,]/g, ""))}
              onBlur={() => { if (initialNum > 0) p.setHealthInitialValue(formatBRLDecimal(initialNum)); }}
              onFocus={() => p.setHealthInitialValue(initialNum ? String(initialNum).replace(".", ",") : "")}
              placeholder="R$ 0,00"
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Aniversário do plano (dd/mm)</Label>
            <Input
              value={p.healthAnniversary}
              onChange={(e) => { p.setAnniversaryTouched(true); p.setHealthAnniversary(e.target.value); }}
              placeholder="dd/mm"
              maxLength={5}
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Categoria contratada</Label>
            <Input
              value={p.healthCategory}
              onChange={(e) => p.setHealthCategory(e.target.value)}
              placeholder="Ex.: Enfermaria, Apartamento, Empresarial..."
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-xl bg-muted px-3 py-2">
            <Label className="text-sm">Coparticipação</Label>
            <Switch checked={p.healthCoparticipation} onCheckedChange={p.setHealthCoparticipation} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Beneficiários</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg h-8"
              onClick={() =>
                p.setBeneficiaries([
                  ...p.beneficiaries,
                  { id: crypto.randomUUID(), title: "titular", name: "", birthDate: "", cpf: "" },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
            </Button>
          </div>

          {p.beneficiaries.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Nenhum beneficiário adicionado.</p>
          )}

          {p.beneficiaries.map((b, idx) => {
            const age = calcAge(b.birthDate);
            const bd = b.birthDate ? new Date(b.birthDate) : undefined;
            const update = (patch: Partial<Beneficiary>) =>
              p.setBeneficiaries(p.beneficiaries.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
            return (
              <div key={b.id} className="rounded-xl border border-border/60 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Título</Label>
                    <Select value={b.title} onValueChange={(v) => update({ title: v as BeneficiaryTitle })}>
                      <SelectTrigger className="mt-1 h-9 rounded-lg bg-muted border-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TITLE_OPTIONS.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {(b.title === "parente" || b.title === "outro") && (
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">
                        {b.title === "parente" ? "Qual parente?" : "Especificar"}
                      </Label>
                      <Input
                        value={b.titleCustom ?? ""}
                        onChange={(e) => update({ titleCustom: e.target.value })}
                        className="mt-1 h-9 rounded-lg bg-muted border-0"
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <Label className="text-[10px] uppercase text-muted-foreground">Nome</Label>
                    <Input
                      value={b.name}
                      onChange={(e) => update({ name: e.target.value })}
                      className="mt-1 h-9 rounded-lg bg-muted border-0"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">
                      Nascimento {age !== null && <span className="text-foreground/70 normal-case">· {age} anos</span>}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn("mt-1 h-9 w-full justify-start rounded-lg bg-muted border-0 font-normal text-sm", !bd && "text-muted-foreground")}
                        >
                          <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                          {bd ? formatDateShort(b.birthDate) : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={bd}
                          onSelect={(d) => update({ birthDate: d ? d.toISOString().slice(0, 10) : "" })}
                          initialFocus
                          captionLayout="dropdown"
                          fromYear={1920}
                          toYear={new Date().getFullYear()}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">CPF</Label>
                    <Input
                      value={b.cpf}
                      onChange={(e) => update({ cpf: maskCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      className="mt-1 h-9 rounded-lg bg-muted border-0"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg h-7 text-destructive hover:text-destructive"
                    onClick={() => p.setBeneficiaries(p.beneficiaries.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (p.branch === "Consórcio") {
    return (
      <div className="space-y-3 rounded-xl border border-border/60 p-4">
        <p className="text-xs font-medium text-muted-foreground">Detalhes do consórcio</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Número do grupo</Label>
            <Input
              value={p.consortiumGroup}
              onChange={(e) => p.setConsortiumGroup(e.target.value)}
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Número da cota</Label>
            <Input
              value={p.consortiumQuota}
              onChange={(e) => p.setConsortiumQuota(e.target.value)}
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select
              value={p.consortiumType ?? ""}
              onValueChange={(v) => p.setConsortiumType?.(v as "Imóvel" | "Auto")}
            >
              <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Imóvel">Imóvel</SelectItem>
                <SelectItem value="Auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export const parsePercent = (s: string): number => {
  const n = Number(s.replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

export const maskPercentInput = (v: string): string => {
  // allow digits and one decimal separator
  let cleaned = v.replace(/[^\d.,]/g, "").replace(".", ",");
  const parts = cleaned.split(",");
  if (parts.length > 2) cleaned = parts[0] + "," + parts.slice(1).join("");
  return cleaned;
};
