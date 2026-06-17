import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/mock/data";
import { formatDateTimeBR, type Expense, type ExpenseEntry, type ManualIncome } from "@/lib/cash/cashStore";
import type { Commission } from "@/lib/mock/data";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

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
  if (!movement) return null;
  const isEntry = movement.kind === "entrada";

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
          <div className="text-xs text-muted-foreground mt-1">{formatDateTimeBR(movement.date)}</div>
        </div>

        <div className="mt-5">
          {movement.details.kind === "comissao" && (
            <>
              <Row label="Tipo" value="Comissão de apólice" />
              <Row label="Cliente" value={movement.details.commission.clientName} />
              <Row label="Seguradora" value={movement.details.commission.insurer} />
              <Row label="Apólice" value={<span className="font-mono text-xs">{movement.details.commission.policyNumber}</span>} />
              <Row label="Status" value={<Badge className="bg-success/15 text-success border-0">pago</Badge>} />
            </>
          )}
          {movement.details.kind === "manual" && (
            <>
              <Row label="Tipo" value="Entrada manual" />
              <Row label="Origem" value={movement.details.income.source} />
              {movement.details.income.notes && <Row label="Observações" value={movement.details.income.notes} />}
            </>
          )}
          {movement.details.kind === "saida" && (
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
      </SheetContent>
    </Sheet>
  );
}
