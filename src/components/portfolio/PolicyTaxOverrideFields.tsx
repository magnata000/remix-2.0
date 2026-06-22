import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCommissionConfigStore } from "@/lib/financial/commissionConfigStore";
import { branchToProduct } from "@/lib/financial/commissionEngine";
import type { Branch, Insurer } from "@/lib/mock/data";

type Props = {
  branch: Branch;
  insurer: Insurer;
  /** undefined = herda da seguradora */
  comissaoLiquida: boolean | undefined;
  setComissaoLiquida: (v: boolean | undefined) => void;
  /** decimal (0.115 = 11,5%); undefined = herda */
  taxaImposto: number | undefined;
  setTaxaImposto: (v: number | undefined) => void;
};

export function PolicyTaxOverrideFields({
  branch,
  insurer,
  comissaoLiquida,
  setComissaoLiquida,
  taxaImposto,
  setTaxaImposto,
}: Props) {
  const { getConfig } = useCommissionConfigStore();
  const product = branchToProduct(branch);
  const defaults = getConfig(insurer, product);

  const effectiveLiquida = comissaoLiquida ?? defaults.comissaoLiquida;
  const effectiveTaxa = taxaImposto ?? defaults.taxaImposto;
  const overriding = comissaoLiquida !== undefined || taxaImposto !== undefined;

  const taxaStr = useMemo(
    () => (effectiveTaxa * 100).toString().replace(".", ","),
    [effectiveTaxa],
  );

  const handleTaxaChange = (s: string) => {
    const n = parseFloat(s.replace(",", "."));
    if (!isFinite(n)) {
      setTaxaImposto(undefined);
      return;
    }
    setTaxaImposto(n / 100);
  };

  const resetToDefault = () => {
    setComissaoLiquida(undefined);
    setTaxaImposto(undefined);
  };

  return (
    <div className="rounded-xl border border-dashed border-border p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm font-medium">Imposto sobre comissão</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Padrão {insurer}:{" "}
            {defaults.comissaoLiquida
              ? `líquida (-${(defaults.taxaImposto * 100).toFixed(1)}%)`
              : "bruta (sem débito)"}
            {overriding && " · sobrescrito nesta apólice"}
          </p>
        </div>
        {overriding && (
          <button
            type="button"
            onClick={resetToDefault}
            className="text-[11px] text-brand hover:underline whitespace-nowrap"
          >
            Usar padrão
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-sm">Comissão líquida (imposto debitado)</Label>
        <Switch
          checked={effectiveLiquida}
          onCheckedChange={(v) => setComissaoLiquida(v)}
        />
      </div>

      {effectiveLiquida && (
        <div>
          <Label className="text-xs text-muted-foreground">Taxa de imposto (%)</Label>
          <Input
            inputMode="decimal"
            value={taxaStr}
            onChange={(e) => handleTaxaChange(e.target.value)}
            className="mt-1.5 rounded-xl bg-muted border-0"
          />
        </div>
      )}
    </div>
  );
}
