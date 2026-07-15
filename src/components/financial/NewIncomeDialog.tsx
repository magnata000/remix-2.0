import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCashStore } from "@/lib/cash/cashStore";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewIncomeDialog({ open, onOpenChange }: Props) {
  const { addIncome } = useCashStore();
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setDescription("");
      setSource("");
      setAmount("");
      setReceivedAt(toLocalInput(new Date()));
      setNotes("");
      setErrors({});
    }
  }, [open]);

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!description.trim()) errs.description = "Obrigatório";
    if (!source.trim()) errs.source = "Obrigatório";
    const amt = Number(amount.replace(",", "."));
    if (!amt || amt <= 0) errs.amount = "Valor inválido";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    addIncome({
      description: description.trim(),
      source: source.trim(),
      amount: amt,
      receivedAt: receivedAt ? new Date(receivedAt).toISOString() : new Date().toISOString(),
      notes: notes.trim() || undefined,
    });
    toast.success("Entrada registrada");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nova entrada manual</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Descrição *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              placeholder="Ex.: Bônus de performance"
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Origem *</Label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={60}
              placeholder="Seguradora, cliente, reembolso…"
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
            {errors.source && <p className="text-xs text-destructive mt-1">{errors.source}</p>}
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
          <div>
            <Label className="text-xs text-muted-foreground">Recebido em *</Label>
            <Input
              type="datetime-local"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
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
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="rounded-xl" onClick={submit}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
