import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Calculator, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCommissionConfigStore } from "@/lib/financial/commissionConfigStore";
import type { CommissionConfig, CommissionProduct, CommissionScheme } from "@/lib/financial/commissionEngine";
import type { Insurer } from "@/lib/mock/data";
import { toast } from "sonner";

const PRODUCT_LABEL: Record<CommissionProduct, string> = {
  auto: "Auto / Seguros",
  saude: "Saúde",
  consorcio: "Consórcio",
};

const SCHEMES_BY_PRODUCT: Record<CommissionProduct, { value: CommissionScheme; label: string }[]> = {
  auto: [
    { value: "esgotamento", label: "Esgotamento (antecipada)" },
    { value: "parcela", label: "Por parcela" },
  ],
  saude: [{ value: "agenciamento", label: "Agenciamento + recorrência" }],
  consorcio: [{ value: "unica", label: "Comissão única" }],
};

const pctToStr = (v: number) => (v * 100).toString().replace(".", ",");
const strToPct = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return isFinite(n) ? n / 100 : 0;
};

export function CommissionConfigSection() {
  const { configs } = useCommissionConfigStore();
  const products: CommissionProduct[] = ["auto", "saude", "consorcio"];

  return (
    <Card className="p-5 rounded-2xl border-border shadow-none">
      <Collapsible defaultOpen={false} className="group/collap">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-start gap-3 w-full text-left cursor-pointer"
          >
            <div className="h-10 w-10 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
              <Calculator className="h-5 w-5 text-brand-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Comissionamento</h2>
              <p className="text-xs text-muted-foreground">
                Regras padrão por seguradora e produto. Alterações aplicam-se apenas a novas apólices.
              </p>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-data-[state=open]/collap:rotate-180" />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4">
          <Tabs defaultValue="auto" className="w-full">
            <TabsList className="rounded-xl">
              {products.map((p) => (
                <TabsTrigger key={p} value={p} className="rounded-lg">
                  {PRODUCT_LABEL[p]}
                </TabsTrigger>
              ))}
            </TabsList>

            {products.map((product) => (
              <TabsContent key={product} value={product} className="mt-4 space-y-3">
                {configs
                  .filter((c) => c.product === product)
                  .map((c) => (
                    <ConfigCard key={`${c.insurer}-${c.product}`} config={c} />
                  ))}
              </TabsContent>
            ))}
          </Tabs>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ConfigCard({ config }: { config: CommissionConfig }) {
  const { updateConfig } = useCommissionConfigStore();
  const [local, setLocal] = useState<CommissionConfig>(config);

  useEffect(() => setLocal(config), [config]);

  const dirty = useMemo(() => JSON.stringify(local) !== JSON.stringify(config), [local, config]);

  const save = () => {
    if (local.pctMin > local.pctMax) {
      toast.error("% mínimo deve ser menor ou igual ao máximo");
      return;
    }
    if (local.taxaImposto < 0 || local.taxaImposto > 1) {
      toast.error("Taxa de imposto inválida");
      return;
    }
    updateConfig(config.insurer, config.product, local);
    toast.success(`${config.insurer} · ${PRODUCT_LABEL[config.product]} atualizado`);
  };

  const setAgItem = (i: number, str: string) => {
    const arr = [...local.agenciamento];
    arr[i] = strToPct(str);
    setLocal({ ...local, agenciamento: arr });
  };
  const addAg = () =>
    setLocal({ ...local, agenciamento: [...local.agenciamento, 0] });
  const removeAg = (i: number) =>
    setLocal({ ...local, agenciamento: local.agenciamento.filter((_, idx) => idx !== i) });

  const isAuto = config.product === "auto";
  const isSaude = config.product === "saude";

  return (
    <Card className="p-4 rounded-xl border-border shadow-none bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-card border flex items-center justify-center font-bold text-xs">
            {(config.insurer as Insurer).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm">{config.insurer}</p>
            <p className="text-xs text-muted-foreground">{PRODUCT_LABEL[config.product]}</p>
          </div>
        </div>
        <Button
          size="sm"
          disabled={!dirty}
          className="rounded-lg bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={save}
        >
          Salvar
        </Button>
      </div>

      <div className="space-y-4">
        {/* Imposto */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-card border">
          <div className="flex-1">
            <Label className="text-sm font-medium">Paga comissão líquida</Label>
            <p className="text-xs text-muted-foreground">Seguradora debita o imposto antes do repasse</p>
          </div>
          <Switch
            checked={local.comissaoLiquida}
            onCheckedChange={(v) => setLocal({ ...local, comissaoLiquida: v })}
          />
        </div>
        {local.comissaoLiquida && (
          <Field
            label="Taxa de imposto (%)"
            value={pctToStr(local.taxaImposto)}
            onChange={(v) => setLocal({ ...local, taxaImposto: strToPct(v) })}
          />
        )}

        {/* Esquema padrão */}
        <div>
          <Label className="text-xs text-muted-foreground">Esquema padrão</Label>
          <Select
            value={local.defaultScheme}
            onValueChange={(v) => setLocal({ ...local, defaultScheme: v as CommissionScheme })}
          >
            <SelectTrigger className="mt-1.5 rounded-lg bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEMES_BY_PRODUCT[config.product].map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Auto: min/max */}
        {isAuto && (
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="% mínimo permitido"
              value={pctToStr(local.pctMin)}
              onChange={(v) => setLocal({ ...local, pctMin: strToPct(v) })}
            />
            <Field
              label="% máximo permitido"
              value={pctToStr(local.pctMax)}
              onChange={(v) => setLocal({ ...local, pctMax: strToPct(v) })}
            />
          </div>
        )}

        {/* Saúde: agenciamento + recorrência */}
        {isSaude && (
          <>
            <Field
              label="% recorrência mensal"
              value={pctToStr(local.recorrenciaPct)}
              onChange={(v) => setLocal({ ...local, recorrenciaPct: strToPct(v) })}
            />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-muted-foreground">
                  Agenciamento (% por parcela)
                </Label>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 rounded-md"
                  onClick={addAg}
                  aria-label="Adicionar parcela"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {local.agenciamento.map((v, i) => (
                  <div key={i} className="relative">
                    <Input
                      value={pctToStr(v)}
                      onChange={(e) => setAgItem(i, e.target.value)}
                      className="rounded-lg bg-card pr-7"
                      inputMode="decimal"
                    />
                    <button
                      type="button"
                      onClick={() => removeAg(i)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted flex items-center justify-center"
                      aria-label={`Remover parcela ${i + 1}`}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Ex.: 100, 50, 30, 20 = 1ª mensalidade integral, 2ª 50%, 3ª 30%, 4ª 20%.
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        className="mt-1.5 rounded-lg bg-card"
      />
    </div>
  );
}
