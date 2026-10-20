import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  cancelPolicy,
  registerPolicyReason,
  type ReasonInput,
} from "@/lib/portfolio/portfolio.functions";
import { REASON_OPTIONS } from "@/lib/portfolio/policyStatus";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  policyId: string | null;
  policyNumber?: string;
  /** cancel = cancela a apólice + motivo; reason = só registra motivo (não renovada). */
  mode: "cancel" | "reason";
};

export function PolicyReasonDialog({ open, onOpenChange, policyId, policyNumber, mode }: Props) {
  const qc = useQueryClient();
  const cancelFn = useServerFn(cancelPolicy);
  const reasonFn = useServerFn(registerPolicyReason);
  const [motivo, setMotivo] = useState<ReasonInput["motivo"] | "">("");
  const [categoria, setCategoria] = useState("");
  const [obs, setObs] = useState("");

  const m = useMutation({
    mutationFn: (input: ReasonInput) =>
      mode === "cancel" ? cancelFn({ data: input }) : reasonFn({ data: input }),
    onSuccess: () => {
      for (const k of ["policies", "clients", "timeline", "pending-reasons", "commissions"])
        void qc.invalidateQueries({ queryKey: [k] });
      toast.success(mode === "cancel" ? "Apólice cancelada" : "Motivo registrado");
      setMotivo("");
      setCategoria("");
      setObs("");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar"),
  });

  const valid = !!motivo && (motivo !== "outro" || categoria.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "cancel" ? "Cancelar apólice" : "Motivo da não renovação"}
          </DialogTitle>
          <DialogDescription>
            {policyNumber ? `${policyNumber} — ` : ""}o motivo fica registrado no histórico do
            cliente e da apólice.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v as ReasonInput["motivo"])}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {motivo === "outro" && (
            <div className="space-y-1.5">
              <Label>Qual?</Label>
              <Input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="rounded-xl"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
              className="rounded-xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={m.isPending}>
            Voltar
          </Button>
          <Button
            disabled={!valid || !policyId || m.isPending}
            variant={mode === "cancel" ? "destructive" : "default"}
            onClick={() =>
              policyId &&
              m.mutate({
                policyId,
                motivo: motivo as ReasonInput["motivo"],
                categoria,
                observacoes: obs,
              })
            }
          >
            {mode === "cancel" ? "Confirmar cancelamento" : "Salvar motivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
