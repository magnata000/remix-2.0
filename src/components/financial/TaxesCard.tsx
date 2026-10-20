import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Landmark, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/mock/data";
import { useCashStore, formatDateBR, MONTHS_PT, taxKindLabel, type TaxEntry } from "@/lib/cash/cashStore";
import { NewTaxSheet } from "@/components/financial/NewTaxSheet";

/** month: 0-11, ou null para o ano inteiro. */
export function TaxesCard({ year, month }: { year: number; month: number | null }) {
  const { taxes, removeTax } = useCashStore();
  const [openTax, setOpenTax] = useState(false);
  const list = taxes
    .filter((t) => t.competenceYear === year && (month === null || t.competenceMonth === month))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "sobre_receita" ? -1 : 1;
      return new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime();
    });
  const totals = list.reduce(
    (acc, t) => {
      if (t.kind === "sobre_receita") acc.receita += t.amount;
      else acc.lucro += t.amount;
      return acc;
    },
    { receita: 0, lucro: 0 },
  );
  const renderBadge = (t: TaxEntry) =>
    t.kind === "sobre_receita" ? (
      <Badge className="bg-primary/10 text-primary border-0">{taxKindLabel[t.kind]}</Badge>
    ) : (
      <Badge className="bg-[color-mix(in_srgb,var(--brand)_15%,transparent)] text-brand border-0">
        {taxKindLabel[t.kind]}
      </Badge>
    );

  return (
    <Card className="rounded-2xl border-border shadow-none">
      <div className="flex items-center justify-between p-5 pb-3">
        <div>
          <h2 className="text-lg font-semibold">Impostos</h2>
          <p className="text-xs text-muted-foreground">
            Competência em {month === null ? "todo o ano de " : `${MONTHS_PT[month]}/`}
            {year}
          </p>
        </div>
        <Button size="sm" className="rounded-full" onClick={() => setOpenTax(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo imposto
        </Button>
      </div>
      <div className="px-5 pb-5">
        {list.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-xl">
            Nenhum imposto lançado neste período.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
                <div className="text-muted-foreground">Sobre Receita</div>
                <div className="font-semibold tabular-nums">{formatBRL(totals.receita)}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
                <div className="text-muted-foreground">Sobre Lucro</div>
                <div className="font-semibold tabular-nums">{formatBRL(totals.lucro)}</div>
              </div>
            </div>
            <div className="space-y-2">
              {list.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{t.description}</span>
                      {renderBadge(t)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Compet.: {MONTHS_PT[t.competenceMonth]}/{t.competenceYear} · Pago em {formatDateBR(t.paidAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums text-destructive">− {formatBRL(t.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      title="Excluir"
                      onClick={() => {
                        removeTax(t.id);
                        toast.success(`"${t.description}" removido`);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <NewTaxSheet
        open={openTax}
        onOpenChange={setOpenTax}
        defaultCompetenceMonth={month ?? new Date().getMonth()}
        defaultCompetenceYear={year}
      />
    </Card>
  );
}
