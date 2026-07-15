import { useEffect, useMemo, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatBRL, formatBRLInt, formatDateShort } from "@/lib/mock/data";
import { useQuoteStore } from "@/lib/multicalc/quoteStore";
import type { Opportunity } from "@/lib/pipeline/opportunityStore";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opportunity: Opportunity | null;
  onConfirm: (closedValue: number) => void;
};

export function CloseOpportunityDialog({ open, onOpenChange, opportunity, onConfirm }: Props) {
  const { records } = useQuoteStore();

  const versions = useMemo(() => {
    if (!opportunity?.quoteGroupId) return [];
    return records
      .filter((r) => r.groupId === opportunity.quoteGroupId)
      .map((r) => {
        const winnerPrice = r.results.find((q) => q.insurer === r.winnerInsurer)?.price ?? 0;
        return {
          id: r.id,
          version: r.version,
          createdAt: r.createdAt,
          winner: r.winnerInsurer,
          price: winnerPrice,
        };
      })
      .sort((a, b) => b.version - a.version);
  }, [records, opportunity?.quoteGroupId]);

  const [selectedId, setSelectedId] = useState<string>("");
  const [manualValue, setManualValue] = useState<string>("");

  useEffect(() => {
    if (open) {
      const first = versions[0];
      setSelectedId(first?.id ?? "");
      setManualValue(first ? String(first.price) : "");
    }
  }, [open, versions]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const v = versions.find((x) => x.id === id);
    if (v) setManualValue(String(v.price));
  };

  const numericValue = Number(manualValue.replace(/\D/g, "")) || 0;
  const canConfirm = numericValue > 0;

  const submit = () => {
    if (!canConfirm) return;
    onConfirm(numericValue);
  };

  if (!opportunity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Fechar oportunidade — {opportunity.clientName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {versions.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Cotação vencedora</Label>
              <RadioGroup value={selectedId} onValueChange={handleSelect} className="space-y-2">
                {versions.map((v) => (
                  <label
                    key={v.id}
                    htmlFor={v.id}
                    className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-brand transition"
                  >
                    <RadioGroupItem value={v.id} id={v.id} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        v{v.version} · {v.winner}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateShort(v.createdAt)}
                      </p>
                    </div>
                    <p className="text-sm font-bold">{formatBRL(v.price)}</p>
                  </label>
                ))}
              </RadioGroup>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma cotação vinculada. Informe o valor fechado manualmente.
            </p>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Valor fechado *</Label>
            <Input
              inputMode="numeric"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value.replace(/\D/g, ""))}
              onBlur={() => {
                if (numericValue > 0) setManualValue(formatBRLInt(numericValue));
              }}
              onFocus={() => setManualValue(String(numericValue || ""))}
              placeholder="R$ 0"
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
            {versions.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Pré-preenchido com o prêmio da cotação selecionada. Edite se necessário.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={submit}
            disabled={!canConfirm}
          >
            Confirmar fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
