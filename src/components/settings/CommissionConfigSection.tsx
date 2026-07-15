import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, Calculator, ChevronDown, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCommissionConfigStore } from "@/lib/financial/commissionConfigStore";
import type {
  CommissionConfig,
  CommissionProduct,
  CommissionScheme,
} from "@/lib/financial/commissionEngine";
import type { Insurer } from "@/lib/mock/data";
import { toast } from "sonner";

const PRODUCT_LABEL: Record<CommissionProduct, string> = {
  auto: "Seguros",
  saude: "Saúde",
  consorcio: "Consórcio",
};

const SCHEMES_BY_PRODUCT: Record<CommissionProduct, { value: CommissionScheme; label: string }[]> =
  {
    auto: [
      { value: "esgotamento", label: "Adiantamento" },
      { value: "parcela", label: "Parcelado" },
    ],
    saude: [
      { value: "agenciamento", label: "Agenciamento + recorrência" },
      { value: "vitalicio", label: "Vitalício" },
    ],
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
          <button type="button" className="flex items-start gap-3 w-full text-left cursor-pointer">
            <div className="h-10 w-10 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
              <Calculator className="h-5 w-5 text-brand-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Comissionamento</h2>
              <p className="text-xs text-muted-foreground">
                Regras padrão por seguradora e produto. Alterações aplicam-se apenas a novas
                apólices.
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
  const { updateConfig, listMalhas, addMalha, removeMalha } = useCommissionConfigStore();
  const [local, setLocal] = useState<CommissionConfig>(config);
  const [newMalhaName, setNewMalhaName] = useState("");

  useEffect(() => setLocal(config), [config]);

  const dirty = useMemo(() => JSON.stringify(local) !== JSON.stringify(config), [local, config]);
  const malhasForInsurer = listMalhas(config.insurer);

  const save = () => {
    if (local.pctMin > local.pctMax) {
      toast.error("% mínimo deve ser menor ou igual ao máximo");
      return;
    }
    if (local.product === "auto") {
      if (
        (local.parceladoMinInstallments ?? 0) < 1 ||
        (local.adiantamentoMaxInstallments ?? 0) < 1
      ) {
        toast.error("Limites de parcelas devem ser ≥ 1");
        return;
      }
    }
    if (local.product === "saude" && local.defaultScheme === "vitalicio") {
      if ((local.vitalicioStartInstallment ?? 0) < 1) {
        toast.error("Parcela inicial do Vitalício deve ser ≥ 1");
        return;
      }
    }
    updateConfig(config.insurer, config.product, local);
    toast.success(`${config.insurer} · ${PRODUCT_LABEL[config.product]} atualizado`);
  };

  const setAgItem = (i: number, str: string) => {
    const arr = [...local.agenciamento];
    arr[i] = strToPct(str);
    setLocal({ ...local, agenciamento: arr });
  };
  const addAg = () => setLocal({ ...local, agenciamento: [...local.agenciamento, 0] });
  const removeAg = (i: number) =>
    setLocal({ ...local, agenciamento: local.agenciamento.filter((_, idx) => idx !== i) });

  const handleAddMalha = () => {
    const name = newMalhaName.trim();
    if (!name) return;
    const m = addMalha(config.insurer, name);
    setLocal({ ...local, malhaId: m.id });
    setNewMalhaName("");
    toast.success(`Malha "${m.name}" criada`);
  };

  const isAuto = config.product === "auto";
  const isSaude = config.product === "saude";
  const isVitalicio = isSaude && local.defaultScheme === "vitalicio";

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
        {/* Tipo */}
        <div>
          <Label className="text-xs text-muted-foreground">Tipo</Label>
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
          <>
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
            {local.defaultScheme === "parcela" && (
              <Field
                label="A partir de X parcelas (Parcelado)"
                value={String(local.parceladoMinInstallments ?? 5)}
                onChange={(v) =>
                  setLocal({
                    ...local,
                    parceladoMinInstallments: Math.max(1, parseInt(v, 10) || 1),
                  })
                }
              />
            )}
            {local.defaultScheme === "esgotamento" && (
              <Field
                label="Até X parcelas (Adiantamento)"
                value={String(local.adiantamentoMaxInstallments ?? 4)}
                onChange={(v) =>
                  setLocal({
                    ...local,
                    adiantamentoMaxInstallments: Math.max(1, parseInt(v, 10) || 1),
                  })
                }
              />
            )}
            <p className="text-[11px] text-muted-foreground -mt-2">
              Define qual tipo fica disponível ao cadastrar a apólice conforme o número de parcelas.
            </p>
          </>
        )}

        {/* Saúde: agenciamento + recorrência + vitalicio + malha */}
        {isSaude && (
          <>
            <Field
              label="% recorrência mensal"
              value={pctToStr(local.recorrenciaPct)}
              onChange={(v) => setLocal({ ...local, recorrenciaPct: strToPct(v) })}
            />
            {isVitalicio && (
              <Field
                label="A partir da parcela (Vitalício)"
                value={String(local.vitalicioStartInstallment ?? 13)}
                onChange={(v) =>
                  setLocal({
                    ...local,
                    vitalicioStartInstallment: Math.max(1, parseInt(v, 10) || 1),
                  })
                }
              />
            )}
            {!isVitalicio && (
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
            )}

            {/* Malha */}
            <div>
              <Label className="text-xs text-muted-foreground">Malha</Label>
              <div className="mt-1.5 flex gap-2">
                <Select
                  value={local.malhaId ?? ""}
                  onValueChange={(v) => setLocal({ ...local, malhaId: v || undefined })}
                >
                  <SelectTrigger className="rounded-lg bg-card flex-1">
                    <SelectValue placeholder="Selecione uma malha" />
                  </SelectTrigger>
                  <SelectContent>
                    {malhasForInsurer.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {local.malhaId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-lg"
                    onClick={() => {
                      const id = local.malhaId!;
                      removeMalha(id);
                      setLocal({ ...local, malhaId: undefined });
                    }}
                    aria-label="Remover malha"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Nova malha…"
                  value={newMalhaName}
                  onChange={(e) => setNewMalhaName(e.target.value)}
                  className="rounded-lg bg-card"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMalha();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg"
                  onClick={handleAddMalha}
                  disabled={!newMalhaName.trim()}
                >
                  Adicionar
                </Button>
              </div>
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
