import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCashStore, type Expense } from "@/lib/cash/cashStore";
import { toast } from "sonner";

type Props = { expense: Expense | null; open: boolean; onOpenChange: (v: boolean) => void };

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RegisterEntryDialog({ expense, open, onOpenChange }: Props) {
  const { registerExpenseEntry } = useCashStore();
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open && expense) {
      setAmount(String(expense.amount));
      setPaidAt(toLocalInput(new Date()));
      setNotes("");
      setErr("");
    }
  }, [open, expense]);

  if (!expense) return null;

  const submit = () => {
    const amt = Number(amount.replace(",", "."));
    if (!amt || amt <= 0) { setErr("Valor inválido"); return; }
    const paidISO = paidAt ? new Date(paidAt).toISOString() : new Date().toISOString();
    registerExpenseEntry(expense.id, { amount: amt, paidAt: paidISO, notes: notes.trim() || undefined });
    toast.success("Pagamento registrado");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {expense.description} · <span className="text-foreground">{expense.category}</span>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Valor pago (R$) *</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="mt-1.5 rounded-xl bg-muted border-0" />
            {err && <p className="text-xs text-destructive mt-1">{err}</p>}
            <p className="text-[11px] text-muted-foreground mt-1">Se diferente do valor base, a despesa será atualizada.</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Pago em *</Label>
            <Input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="mt-1.5 rounded-xl bg-muted border-0" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} rows={3} className="mt-1.5 rounded-xl bg-muted border-0" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="rounded-xl" onClick={submit}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
