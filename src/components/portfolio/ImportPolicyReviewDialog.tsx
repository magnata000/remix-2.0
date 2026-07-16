import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle } from "lucide-react";
import type { PolicyExtractionResult } from "@/lib/portfolio/policyExtraction.functions";

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
  extraction: PolicyExtractionResult | null;
  onConfirm: (prefill: PolicyPrefill) => void;
};

function ConfidenceBadge({ score }: { score?: number }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const cls =
    score >= 0.8
      ? "bg-success/15 text-success"
      : score >= 0.5
        ? "bg-warning/15 text-warning"
        : "bg-destructive/15 text-destructive";
  return <Badge className={`${cls} border-0 text-[10px]`}>{pct}%</Badge>;
}

export function ImportPolicyReviewDialog({ open, onOpenChange, extraction, onConfirm }: Props) {
  const [clientName, setClientName] = useState("");
  const [insurer, setInsurer] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [premium, setPremium] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!open || !extraction) return;
    const f = extraction.fields;
    setClientName(f.clientName ?? "");
    setInsurer(f.insurer ?? "");
    setPolicyNumber(f.policyNumber ?? "");
    setPremium(f.premium != null ? String(f.premium).replace(".", ",") : "");
    setStartDate(f.startDate ?? "");
    setEndDate(f.endDate ?? "");
  }, [open, extraction]);

  const conf = extraction?.confidence ?? {};
  const warnings = extraction?.warnings ?? [];

  const confirm = () => {
    const premiumNum = Number(premium.replace(/\./g, "").replace(",", "."));
    onConfirm({
      clientName: clientName || undefined,
      insurer: insurer || undefined,
      policyNumber: policyNumber || undefined,
      premium: Number.isFinite(premiumNum) && premiumNum > 0 ? premiumNum : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            Revisar dados extraídos
          </DialogTitle>
          <DialogDescription>
            Confirme os campos identificados pela IA antes de abrir o formulário.
          </DialogDescription>
        </DialogHeader>

        {warnings.length > 0 && (
          <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 text-xs text-warning flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <ul className="space-y-1">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          <Field label="Cliente" score={conf.clientName}>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="rounded-xl bg-muted border-0" />
          </Field>
          <Field label="Seguradora" score={conf.insurer}>
            <Input value={insurer} onChange={(e) => setInsurer(e.target.value)} className="rounded-xl bg-muted border-0" />
          </Field>
          <Field label="Número da apólice" score={conf.policyNumber}>
            <Input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} className="rounded-xl bg-muted border-0" />
          </Field>
          <Field label="Prêmio (R$)" score={conf.premium}>
            <Input value={premium} onChange={(e) => setPremium(e.target.value)} inputMode="decimal" className="rounded-xl bg-muted border-0" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início vigência" score={conf.startDate}>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl bg-muted border-0" />
            </Field>
            <Field label="Fim vigência" score={conf.endDate}>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl bg-muted border-0" />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={confirm} className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  score,
  children,
}: {
  label: string;
  score?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <ConfidenceBadge score={score} />
      </div>
      {children}
    </div>
  );
}
