import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCashStore, MONTHS_PT, type TaxKind } from "@/lib/cash/cashStore";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultCompetenceMonth?: number;
  defaultCompetenceYear?: number;
};

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function NewTaxSheet({
  open,
  onOpenChange,
  defaultCompetenceMonth,
  defaultCompetenceYear,
}: Props) {
  const { addTax } = useCashStore();
  const [kind, setKind] = useState<TaxKind | "">("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [compMonth, setCompMonth] = useState<number>(defaultCompetenceMonth ?? new Date().getMonth());
  const [compYear, setCompYear] = useState<number>(defaultCompetenceYear ?? currentYear);
  const [paidAt, setPaidAt] = useState<string>(todayISO());
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setKind("");
      setDescription("");
      setAmount("");
      setCompMonth(defaultCompetenceMonth ?? new Date().getMonth());
      setCompYear(defaultCompetenceYear ?? currentYear);
      setPaidAt(todayISO());
      setNotes("");
      setErrors({});
    }
  }, [open, defaultCompetenceMonth, defaultCompetenceYear]);

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!kind) errs.kind = "Obrigatório";
    if (!description.trim()) errs.description = "Obrigatório";
    const amt = Number(amount.replace(",", "."));
    if (!amt || amt <= 0) errs.amount = "Valor inválido";
    if (!paidAt) errs.paidAt = "Obrigatório";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    addTax({
      kind: kind as TaxKind,
      description: description.trim(),
      amount: amt,
      competenceMonth: compMonth,
      competenceYear: compYear,
      paidAt: new Date(`${paidAt}T12:00:00`).toISOString(),
      notes: notes.trim() || undefined,
    });
    toast.success("Imposto lançado");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novo imposto</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs text-muted-foreground">Tipo *</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as TaxKind)}>
              <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                <SelectValue placeholder="Selecione o tipo de imposto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sobre_receita">Imposto sobre Receita</SelectItem>
                <SelectItem value="sobre_lucro">Imposto sobre Lucro</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              "Sobre Receita" reduz a Receita Líquida; "Sobre Lucro" reduz o Lucro Líquido no DRE.
            </p>
            {errors.kind && <p className="text-xs text-destructive mt-1">{errors.kind}</p>}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Descrição *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              placeholder="Ex.: PIS/COFINS Julho"
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Valor (R$) *</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
            {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Competência · mês *</Label>
              <Select value={String(compMonth)} onValueChange={(v) => setCompMonth(Number(v))}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_PT.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Competência · ano *</Label>
              <Select value={String(compYear)} onValueChange={(v) => setCompYear(Number(v))}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            A competência define em qual mês o imposto entra no DRE (regime de competência).
          </p>

          <div>
            <Label className="text-xs text-muted-foreground">Pago em *</Label>
            <Input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Data em que o valor saiu do caixa (aparece nas Movimentações).
            </p>
            {errors.paidAt && <p className="text-xs text-destructive mt-1">{errors.paidAt}</p>}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              rows={3}
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="rounded-xl" onClick={submit}>
            Lançar imposto
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
