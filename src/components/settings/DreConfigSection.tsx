import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator } from "lucide-react";
import { useDreConfig, type CategoryKind } from "@/lib/financial/dreConfigStore";
import { useCashStore } from "@/lib/cash/cashStore";
import { toast } from "sonner";

export function DreConfigSection() {
  const {
    taxOnRevenuePct,
    taxOnProfitPct,
    setTaxOnRevenuePct,
    setTaxOnProfitPct,
    setCategoryKind,
    classify,
    resetDefaults,
  } = useDreConfig();
  const { expenses, entries } = useCashStore();

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(e.category));
    entries.forEach((e) => set.add(e.category));
    return Array.from(set).sort();
  }, [expenses, entries]);

  return (
    <Card className="p-5 rounded-2xl border-border shadow-none">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-brand-soft flex items-center justify-center">
          <Calculator className="h-5 w-5 text-brand-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">DRE & Impostos</h2>
          <p className="text-xs text-muted-foreground">
            Alíquotas e classificação de categorias usadas na aba Relatórios
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { resetDefaults(); toast.success("Padrões restaurados"); }}>
          Restaurar padrões
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <Label className="text-xs text-muted-foreground">Imposto sobre Receita (%)</Label>
          <Input
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={taxOnRevenuePct}
            onChange={(e) => setTaxOnRevenuePct(Number(e.target.value) || 0)}
            className="mt-1.5 rounded-xl bg-muted border-0"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Imposto sobre Lucro (%)</Label>
          <Input
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={taxOnProfitPct}
            onChange={(e) => setTaxOnProfitPct(Number(e.target.value) || 0)}
            className="mt-1.5 rounded-xl bg-muted border-0"
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Classificação de categorias</p>
        <p className="text-xs text-muted-foreground mb-3">
          Define quais categorias entram como Custo Operacional (acima do Lucro Bruto) e quais como Despesa Operacional (acima do Lucro Operacional).
        </p>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhuma categoria cadastrada em Caixa.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                <span className="flex-1 text-sm font-medium">{cat}</span>
                <Select value={classify(cat)} onValueChange={(v) => setCategoryKind(cat, v as CategoryKind)}>
                  <SelectTrigger className="h-8 w-56 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custo_operacional">Custo Operacional</SelectItem>
                    <SelectItem value="despesa_operacional">Despesa Operacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
