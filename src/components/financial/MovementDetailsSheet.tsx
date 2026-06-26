import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDateShort } from "@/lib/mock/data";
import { formatDateTimeBR, formatDateBR, type Expense, type ExpenseEntry, type ManualIncome } from "@/lib/cash/cashStore";
import type { Commission } from "@/lib/mock/data";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { useCommissionConfigStore } from "@/lib/financial/commissionConfigStore";
import { commissionKindLabel } from "@/lib/financial/commissionEngine";
import { commissionStatusColor } from "@/components/financial/CommissionStatusMenu";
import { usePolicyStore } from "@/lib/portfolio/policyStore";

export type MovementDetails =
  | { kind: "comissao"; commission: Commission }
  | { kind: "manual"; income: ManualIncome }
  | { kind: "saida"; entry: ExpenseEntry; expense?: Expense };

export type Movement = {
  id: string;
  kind: "entrada" | "saida";
  date: string;
  description: string;
  amount: number;
  details: MovementDetails;
};

type Props = { movement: Movement | null; open: boolean; onOpenChange: (v: boolean) => void };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground text-right">{value}</span>
    </div>
  );
}

export function MovementDetailsSheet({ movement, open, onOpenChange }: Props) {
  const { scheduleOfPolicy } = useCommissionStore();
  const { findPolicy } = usePolicyStore();
  const { configForPolicy, findMalha } = useCommissionConfigStore();
  if (!movement) return null;
  const isEntry = movement.kind === "entrada";
  const policyForComm = movement.details.kind === "comissao" && movement.details.commission.policyId
    ? findPolicy(movement.details.commission.policyId)
    : undefined;
  const malhaName = policyForComm && policyForComm.branch === "Saúde"
    ? findMalha(configForPolicy(policyForComm).malhaId)?.name
    : undefined;
  const schedule = movement.details.kind === "comissao" && movement.details.commission.policyId
    ? scheduleOfPolicy(movement.details.commission.policyId)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isEntry ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/15 text-success text-xs">
                <ArrowDownCircle className="h-3.5 w-3.5" /> Entrada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-xs">
                <ArrowUpCircle className="h-3.5 w-3.5" /> Saída
              </span>
            )}
            <span className="text-base">{movement.description}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5">
          <div className={`text-3xl font-bold ${isEntry ? "text-success" : "text-destructive"}`}>
            {isEntry ? "+" : "−"} {formatBRL(movement.amount)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{movement.date}</div>
        </div>

        <div className="mt-5">
          {movement.details.kind === "comissao" && (() => {
            const c = movement.details.commission;
            const statusClass = commissionStatusColor[c.status];
            const instLabel = c.installmentTotal && c.installmentTotal > 1 && c.installmentIndex
              ? `${c.installmentIndex}/${c.installmentTotal}`
              : "—";
            return (
              <>
                <Row label="Tipo" value={`Comissão · ${commissionKindLabel(c.kind)}`} />
                <Row label="Cliente" value={c.clientName} />
                <Row label="Seguradora" value={c.insurer} />
                <Row label="Apólice" value={<span className="font-mono text-xs">{c.policyNumber}</span>} />
                {malhaName && <Row label="Malha" value={malhaName} />}
                <Row label="Parcela" value={instLabel} />
                <Row label="Vencimento" value={formatDateBR(c.dueDate)} />
                {c.paidAt && <Row label="Pago em" value={formatDateTimeBR(c.paidAt)} />}
                {c.refundedAt && <Row label="Devolvida em" value={formatDateTimeBR(c.refundedAt)} />}
                {c.refundReason && <Row label="Motivo" value={c.refundReason} />}
                <Row label="Status" value={<Badge className={statusClass}>{c.status}</Badge>} />
              </>
            );
          })()}
          {movement.details.kind === "manual" && (
            <>
              <Row label="Tipo" value="Entrada manual" />
              <Row label="Origem" value={movement.details.income.source} />
              {movement.details.income.notes && <Row label="Observações" value={movement.details.income.notes} />}
            </>
          )}
          {movement.details.kind === "saida" && movement.details.entry && (
            <>
              <Row label="Tipo" value="Pagamento de despesa" />
              <Row label="Categoria" value={<Badge className="bg-muted text-muted-foreground border-0">{movement.details.entry.category}</Badge>} />
              {movement.details.expense && (
                <Row
                  label="Despesa-mãe"
                  value={
                    <span>
                      {movement.details.expense.description}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({movement.details.expense.recurrence === "mensal"
                          ? `Mensal · dia ${movement.details.expense.dueDay}`
                          : "Avulsa"})
                      </span>
                    </span>
                  }
                />
              )}
              {movement.details.entry.notes && <Row label="Observações" value={movement.details.entry.notes} />}
            </>
          )}
        </div>

        {schedule.length > 1 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2">Cronograma da apólice</h3>
            <div className="rounded-xl border border-border divide-y divide-border text-xs">
              {schedule.map((s) => {
                const isCurrent = movement.details.kind === "comissao" && movement.details.commission.id === s.id;
                const statusClr =
                  s.status === "pago" ? "text-success"
                  : s.status === "atrasado" ? "text-destructive"
                  : s.status === "devolvido" ? "text-destructive"
                  : s.status === "cancelada" ? "text-muted-foreground line-through"
                  : "text-warning";
                return (
                  <div key={s.id} className={`flex items-center justify-between gap-3 px-3 py-2 ${isCurrent ? "bg-muted/50" : ""}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground">{commissionKindLabel(s.kind)}</span>
                      {s.installmentTotal && s.installmentTotal > 1 && (
                        <span className="text-muted-foreground">{s.installmentIndex}/{s.installmentTotal}</span>
                      )}
                      <span className="text-muted-foreground">· {formatDateShort(s.dueDate)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`uppercase text-[10px] ${statusClr}`}>{s.status}</span>
                      <span className={`font-mono ${s.status === "cancelada" ? "line-through text-muted-foreground" : ""}`}>{formatBRL(s.amount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
