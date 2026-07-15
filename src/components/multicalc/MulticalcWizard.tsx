import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, RefreshCw, Sparkles, Star, Trophy, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, Insurer, Quote, Branch } from "@/lib/mock/data";
import { QuoteFormData, emptyForm, generateResults } from "@/lib/multicalc/quoteStore";

const steps = ["Cliente", "Objeto", "Coberturas", "Resultado"];

type WizardCompletePayload = {
  formData: QuoteFormData;
  results: Quote[];
  winner: Insurer;
};

type Props = {
  initialData?: QuoteFormData;
  editingLabel?: string; // e.g. "Editando v2 de João Silva"
  onComplete: (payload: WizardCompletePayload) => void;
};

export function MulticalcWizard({ initialData, editingLabel, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [calculating, setCalculating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [form, setForm] = useState<QuoteFormData>(() => initialData ?? emptyForm());
  const [results, setResults] = useState<Quote[]>([]);

  const update = <G extends keyof QuoteFormData>(group: G, key: keyof QuoteFormData[G], value: string) => {
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }));
  };

  const calc = () => {
    setCalculating(true);
    setShowResult(false);
    setTimeout(() => {
      setResults(generateResults(form));
      setCalculating(false);
      setShowResult(true);
      toast.success("5 cotações disponíveis");
    }, 800);
  };

  const next = () => {
    if (step < 2) setStep(step + 1);
    else { setStep(3); calc(); }
  };

  const recalc = () => {
    if (Math.random() > 0.7) {
      toast.error("Falha ao consultar SulAmérica", {
        description: "Tempo de resposta excedido. Tente novamente.",
      });
      return;
    }
    calc();
  };

  const cheapest = results.length ? Math.min(...results.map((q) => q.price)) : 0;

  const select = (q: Quote) => {
    onComplete({ formData: form, results, winner: q.insurer });
    // reset wizard
    setStep(0);
    setShowResult(false);
    setForm(emptyForm());
  };

  return (
    <div className="space-y-5">
      {editingLabel && (
        <Card className="p-3 rounded-xl border-warning/40 bg-warning/10 shadow-none">
          <div className="flex items-center gap-2 text-sm">
            <Pencil className="h-4 w-4 text-warning-foreground" />
            <span className="font-medium">{editingLabel}</span>
            <span className="text-muted-foreground">— uma nova versão será criada ao salvar</span>
          </div>
        </Card>
      )}

      {/* Stepper */}
      <Card className="p-4 rounded-2xl border-border shadow-none">
        <div className="flex items-center gap-2 overflow-x-auto">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 shrink-0">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
                  i < step ? "bg-success text-success-foreground"
                    : i === step ? "bg-brand text-brand-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-sm whitespace-nowrap ${i === step ? "font-semibold" : "text-muted-foreground"}`}>
                {s}
              </span>
              {i < steps.length - 1 && <div className="w-6 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>
      </Card>

      {step < 3 && (
        <Card className="p-6 rounded-2xl border-border shadow-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {step === 0 && (
              <>
                <Field label="Nome do cliente" placeholder="Ex: João Silva" value={form.cliente.nome} onChange={(v) => update("cliente", "nome", v)} />
                <Field label="CPF" placeholder="000.000.000-00" value={form.cliente.cpf} onChange={(v) => update("cliente", "cpf", v)} />
                <Field label="E-mail" placeholder="cliente@email.com" value={form.cliente.email} onChange={(v) => update("cliente", "email", v)} />
                <Field label="Telefone" placeholder="(11) 90000-0000" value={form.cliente.telefone} onChange={(v) => update("cliente", "telefone", v)} />
              </>
            )}
            {step === 1 && (
              <>
                <SelectField label="Tipo de seguro" options={["Auto", "Vida", "Residencial", "Empresarial", "Saúde"]} value={form.objeto.tipo} onChange={(v) => update("objeto", "tipo", v as Branch)} />
                <Field label="Marca / Modelo" placeholder="Ex: Honda Civic" value={form.objeto.marcaModelo} onChange={(v) => update("objeto", "marcaModelo", v)} />
                <Field label="Ano" placeholder="2024" value={form.objeto.ano} onChange={(v) => update("objeto", "ano", v)} />
                <Field label="CEP de pernoite" placeholder="00000-000" value={form.objeto.cep} onChange={(v) => update("objeto", "cep", v)} />
              </>
            )}
            {step === 2 && (
              <>
                <SelectField label="Cobertura terceiros" options={["50.000", "100.000", "200.000"]} value={form.coberturas.terceiros} onChange={(v) => update("coberturas", "terceiros", v)} />
                <SelectField label="Carro reserva" options={["Sim", "Não"]} value={form.coberturas.carroReserva} onChange={(v) => update("coberturas", "carroReserva", v)} />
                <SelectField label="Vidros" options={["Completo", "Para-brisa", "Não"]} value={form.coberturas.vidros} onChange={(v) => update("coberturas", "vidros", v)} />
                <SelectField label="Assistência 24h" options={["Sim", "Não"]} value={form.coberturas.assistencia24h} onChange={(v) => update("coberturas", "assistencia24h", v)} />
              </>
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" className="rounded-xl" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              Voltar
            </Button>
            <Button onClick={next} className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
              {step === 2 ? (<><Sparkles className="h-4 w-4 mr-2" />Calcular</>) : "Próximo"}
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Cotações encontradas</h2>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep(2)}>
                Editar parâmetros
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={recalc} disabled={calculating}>
                <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? "animate-spin" : ""}`} />
                Recalcular
              </Button>
            </div>
          </div>

          {calculating ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-64 rounded-2xl" />))}
            </div>
          ) : (
            showResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {results.map((q) => {
                  const winner = q.price === cheapest;
                  return (
                    <Card key={q.insurer} className={`p-5 rounded-2xl border shadow-none flex flex-col ${winner ? "border-brand bg-brand/15" : "border-border"}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{q.insurer}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            <span className="text-xs">{q.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        {winner && (<Badge className="bg-brand text-brand-foreground border-0"><Trophy className="h-3 w-3 mr-1" /> Melhor</Badge>)}
                      </div>
                      <p className="mt-4 text-3xl font-bold tracking-tight">{formatBRL(q.price)}</p>
                      <p className="text-xs text-muted-foreground">/ ano</p>
                      <div className="mt-4 space-y-1.5">
                        {q.coverages.map((c) => (
                          <div key={c} className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-success" />{c}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs">
                        <span className="text-muted-foreground">Franquia</span>
                        <span className="font-semibold">{formatBRL(q.deductible)}</span>
                      </div>
                      <Button
                        className={`mt-4 w-full rounded-xl ${winner ? "bg-brand text-brand-foreground hover:bg-brand/90" : "bg-foreground text-background hover:bg-foreground/90"}`}
                        onClick={() => select(q)}
                      >
                        Selecionar e salvar
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, placeholder, value, onChange }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 rounded-xl bg-muted border-0" />
    </div>
  );
}

function SelectField({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}
