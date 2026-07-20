import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/mock/data";
import { useSellerPayoutStore } from "@/lib/financial/sellerPayoutStore";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  seller: { id: string; name: string } | null;
  suggestedAmount: number;
};

const todayLocal = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

export function PaySellerPayoutDialog({ open, onOpenChange, seller, suggestedAmount }: Props) {
  const { addPayout } = useSellerPayoutStore();
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(todayLocal());
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open) {
      setAmount(suggestedAmount > 0 ? suggestedAmount.toFixed(2) : "");
      setDate(todayLocal());
      setNotes("");
    }
  }, [open, suggestedAmount]);

  const parsed = Number(amount);
  const valid =
    seller && Number.isFinite(parsed) && parsed > 0 && parsed <= suggestedAmount + 0.001;

  const submit = () => {
    if (!seller || !valid) return;
    addPayout({
      sellerId: seller.id,
      amount: Math.round(parsed * 100) / 100,
      paidAt: new Date(`${date}T12:00:00`).toISOString(),
      notes: notes.trim() || undefined,
    });
    toast.success(`Repasse de ${formatBRL(parsed)} registrado para ${seller.name}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar repasse</DialogTitle>
          <DialogDescription>
            {seller ? (
              <>
                Você está registrando um repasse para{" "}
                <span className="font-medium text-foreground">{seller.name}</span>.
              </>
            ) : (
              "Selecione um vendedor."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Saldo devedor</div>
            <div className="text-lg font-semibold tabular-nums">{formatBRL(suggestedAmount)}</div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Valor do repasse</Label>
            <Input
              id="pay-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Pré-preenchido com o saldo total. Ajuste para efetuar um repasse parcial.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Data do pagamento</Label>
            <Input
              id="pay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-notes">Observações (opcional)</Label>
            <Textarea
              id="pay-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!valid}>
            Confirmar repasse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
