import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCashStore, type ExpenseRecurrence } from "@/lib/cash/cashStore";
import type { CategoryKind } from "@/lib/financial/dreConfigStore";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

const CATEGORIES = [
  "Aluguel",
  "Software",
  "Marketing",
  "Impostos",
  "Salários",
  "Serviços",
  "Infra",
  "Viagens",
  "Outros",
];

export function NewExpenseSheet({ open, onOpenChange }: Props) {
  const { addExpense } = useCashStore();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [dreKind, setDreKind] = useState<CategoryKind | "">("");
  const [amount, setAmount] = useState("");
  const [recurrence, setRecurrence] = useState<ExpenseRecurrence>("avulsa");
  const [dueDay, setDueDay] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setDescription("");
      setCategory("");
      setDreKind("");
      setAmount("");
      setRecurrence("avulsa");
      setDueDay("");
      setNotes("");
      setErrors({});
    }
  }, [open]);

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!description.trim()) errs.description = "Obrigatório";
    if (!category.trim()) errs.category = "Obrigatório";
    if (!dreKind) errs.dreKind = "Obrigatório";
    const amt = Number(amount.replace(",", "."));
    if (!amt || amt <= 0) errs.amount = "Valor inválido";
    let dd: number | undefined;
    if (recurrence === "mensal") {
      dd = Number(dueDay);
      if (!dd || dd < 1 || dd > 31) errs.dueDay = "Dia 1–31";
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    addExpense({
      description: description.trim(),
      category: category.trim(),
      dreKind: dreKind as CategoryKind,
      amount: amt,
      recurrence,
      dueDay: dd,
      notes: notes.trim() || undefined,
    });
    toast.success("Despesa criada");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nova despesa</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs text-muted-foreground">Descrição *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              placeholder="Ex.: Aluguel"
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Classificação DRE *</Label>
            <Select value={dreKind} onValueChange={(v) => setDreKind(v as CategoryKind)}>
              <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
                <SelectValue placeholder="Selecione a classificação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custo_operacional">Custo Operacional</SelectItem>
                <SelectItem value="despesa_operacional">Despesa Operacional</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Usado para contabilizar no DRE.
            </p>
            {errors.dreKind && <p className="text-xs text-destructive mt-1">{errors.dreKind}</p>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Valor base (R$) *</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
            {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Recorrência *</Label>
            <RadioGroup
              value={recurrence}
              onValueChange={(v) => setRecurrence(v as ExpenseRecurrence)}
              className="flex gap-4 mt-2"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="avulsa" /> Avulsa
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="mensal" /> Mensal
              </label>
            </RadioGroup>
          </div>
          {recurrence === "mensal" && (
            <div>
              <Label className="text-xs text-muted-foreground">Dia do vencimento *</Label>
              <Input
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
                inputMode="numeric"
                placeholder="1–31"
                className="mt-1.5 rounded-xl bg-muted border-0"
              />
              {errors.dueDay && <p className="text-xs text-destructive mt-1">{errors.dueDay}</p>}
            </div>
          )}
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
            Criar despesa
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
