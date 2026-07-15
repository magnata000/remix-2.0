import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatBRL } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import type { DreResult } from "@/lib/financial/reportMetrics";

type RowProps = {
  label: string;
  value: number;
  variant?: "normal" | "deduction" | "subtotal" | "final";
  children?: Array<{ name: string; value: number }>;
};

function DreRow({ label, value, variant = "normal", children }: RowProps) {
  const [open, setOpen] = useState(false);
  const hasChildren = children && children.length > 0;
  const rowClass = cn(
    "grid grid-cols-[1fr_auto] items-center gap-2 px-4 py-2.5 rounded-lg text-sm",
    variant === "subtotal" && "bg-muted/50 font-semibold",
    variant === "final" && "bg-brand/15 font-bold text-base",
    variant === "deduction" && "text-muted-foreground",
  );
  const sign = variant === "deduction" ? "-" : "";
  return (
    <div>
      <div
        className={cn(rowClass, hasChildren && "cursor-pointer hover:bg-muted/40")}
        onClick={() => hasChildren && setOpen((o) => !o)}
        role={hasChildren ? "button" : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasChildren ? (
            open ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )
          ) : (
            <span className="w-3.5" />
          )}
          <span className="truncate">{label}</span>
        </div>
        <span className="tabular-nums">
          {sign}
          {formatBRL(value)}
        </span>
      </div>
      {hasChildren && open && (
        <div className="pl-9 pr-4 py-1 space-y-0.5">
          {children!.map((c) => (
            <div
              key={c.name}
              className="grid grid-cols-[1fr_auto] items-center gap-2 py-1 text-xs text-muted-foreground"
            >
              <span className="truncate">{c.name}</span>
              <span className="tabular-nums">{formatBRL(c.value)}</span>
            </div>
          ))}
          {children!.length === 0 && (
            <div className="py-1 text-xs text-muted-foreground italic">Sem lançamentos.</div>
          )}
        </div>
      )}
    </div>
  );
}

export function DreTable({ dre }: { dre: DreResult }) {
  const receitaChildren = [
    { name: "Comissões pagas", value: dre.breakdown.receita.comissoes },
    { name: "Receitas manuais", value: dre.breakdown.receita.manuais },
  ].filter((r) => r.value > 0);

  return (
    <Card className="p-5 rounded-2xl border-border shadow-none">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">DRE Simplificada</h2>
        <p className="text-xs text-muted-foreground">Demonstração do resultado no período</p>
      </div>
      <div className="space-y-0.5">
        <DreRow label="Receita Bruta" value={dre.receitaBruta} children={receitaChildren} />
        <DreRow label="(−) Devoluções" value={dre.devolucoes} variant="deduction" />
        <DreRow
          label="(−) Impostos sobre Receita"
          value={dre.impostosReceita}
          variant="deduction"
        />
        <DreRow label="Receita Líquida" value={dre.receitaLiquida} variant="subtotal" />
        <DreRow
          label="(−) Custos Operacionais"
          value={dre.custos}
          variant="deduction"
          children={dre.breakdown.custosByCat}
        />
        <DreRow label="Lucro Bruto" value={dre.lucroBruto} variant="subtotal" />
        <DreRow
          label="(−) Despesas Operacionais"
          value={dre.despesas}
          variant="deduction"
          children={dre.breakdown.despesasByCat}
        />
        <DreRow label="Lucro Operacional" value={dre.lucroOperacional} variant="subtotal" />
        <DreRow label="(−) Impostos sobre Lucro" value={dre.impostosLucro} variant="deduction" />
        <DreRow label="Lucro Líquido" value={dre.lucroLiquido} variant="final" />
      </div>
    </Card>
  );
}
