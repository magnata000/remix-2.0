import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LostReason, lostReasonLabel } from "@/lib/mock/data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onConfirm: (reason: LostReason, note?: string) => void;
};

const REASONS: LostReason[] = ["preco", "cobertura", "prazo", "sem-retorno", "outro"];

export function LostReasonDialog({
  open,
  onOpenChange,
  title = "Marcar como perdida",
  onConfirm,
}: Props) {
  const [reason, setReason] = useState<LostReason>("preco");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setReason("preco");
      setNote("");
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm(reason, note.trim() ? note.trim() : undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Motivo</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as LostReason)}>
              <SelectTrigger className="rounded-xl bg-muted border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {lostReasonLabel[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Detalhe o motivo..."
              className="rounded-xl bg-muted border-0 resize-none"
            />
            <p className="text-[11px] text-muted-foreground text-right">{note.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={handleConfirm}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
