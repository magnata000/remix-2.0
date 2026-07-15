import { useEffect, useState } from "react";
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

  // Estado local do input para permitir apagar livremente sem voltar pro padrão
  const [taxaDraft, setTaxaDraft] = useState<string>(() =>
    (effectiveTaxa * 100).toString().replace(".", ","),
  );

  // Sincroniza quando override é resetado externamente (Usar padrão)
  useEffect(() => {
    if (taxaImposto === undefined) {
      setTaxaDraft((defaults.taxaImposto * 100).toString().replace(".", ","));
    }
  }, [taxaImposto, defaults.taxaImposto]);

  const handleTaxaChange = (s: string) => {
    setTaxaDraft(s);
    const trimmed = s.trim();
    if (trimmed === "") {
      // permite apagar; não cai pro padrão silenciosamente
      setTaxaImposto(0);
      return;
    }
    const n = parseFloat(trimmed.replace(",", "."));
    if (!isFinite(n)) return;
    setTaxaImposto(n / 100);
  };

  const resetToDefault = () => {
    setComissaoLiquida(undefined);
    setTaxaImposto(undefined);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Switch
            checked={effectiveLiquida}
            onCheckedChange={(v) => setComissaoLiquida(v)}
            id="comissao-liquida"
          />
          <Label htmlFor="comissao-liquida" className="text-sm cursor-pointer">
            Comissão líquida
          </Label>
        </div>
        {effectiveLiquida && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Input
              inputMode="decimal"
              value={taxaDraft}
              onChange={(e) => handleTaxaChange(e.target.value)}
              className="h-8 w-20 rounded-lg bg-muted border-0 text-right"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pl-[3.25rem]">
        <span>
          Padrão {insurer} ·{" "}
          {defaults.comissaoLiquida
            ? `${(defaults.taxaImposto * 100).toFixed(1).replace(".", ",")}%`
            : "sem imposto"}
        </span>
        {overriding && (
          <button type="button" onClick={resetToDefault} className="text-brand hover:underline">
            Usar padrão
          </button>
        )}
      </div>
    </div>
  );
}
