import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, RefreshCw, Sparkles, Star, Trophy } from "lucide-react";
import { toast } from "sonner";
import { quotes, formatBRL } from "@/lib/mock/data";

const steps = ["Cliente", "Objeto", "Coberturas", "Resultado"];

export function MulticalcModule() {
  const [step, setStep] = useState(0);
  const [calculating, setCalculating] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const calc = () => {
    setCalculating(true);
    setShowResult(false);
    setTimeout(() => {
      setCalculating(false);
      setShowResult(true);
      toast.success("5 cotações disponíveis");
    }, 900);
  };

  const next = () => {
    if (step < 2) setStep(step + 1);
    else {
      setStep(3);
      calc();
    }
  };

  const recalc = () => {
    // simula falha 50/50
    if (Math.random() > 0.5) {
      toast.error("Falha ao consultar SulAmérica", {
        description: "Tempo de resposta excedido. Tente novamente.",
      });
      return;
    }
    calc();
  };

  const cheapest = Math.min(...quotes.map((q) => q.price));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Multicálculo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare ofertas de várias seguradoras em segundos
        </p>
      </div>

      {/* Stepper */}
      <Card className="p-4 rounded-2xl border-border shadow-none">
        <div className="flex items-center gap-2 overflow-x-auto">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 shrink-0">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
                  i < step
                    ? "bg-success text-success-foreground"
                    : i === step
                      ? "bg-brand text-brand-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-sm whitespace-nowrap ${
                  i === step ? "font-semibold" : "text-muted-foreground"
                }`}
              >
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
                <Field label="Nome do cliente" placeholder="Ex: João Silva" />
                <Field label="CPF" placeholder="000.000.000-00" />
                <Field label="E-mail" placeholder="cliente@email.com" />
                <Field label="Telefone" placeholder="(11) 90000-0000" />
              </>
            )}
            {step === 1 && (
              <>
                <SelectField label="Tipo de seguro" options={["Auto", "Vida", "Residencial"]} />
                <Field label="Marca / Modelo" placeholder="Ex: Honda Civic" />
                <Field label="Ano" placeholder="2024" />
                <Field label="CEP de pernoite" placeholder="00000-000" />
              </>
            )}
            {step === 2 && (
              <>
                <SelectField
                  label="Cobertura terceiros"
                  options={["50.000", "100.000", "200.000"]}
                />
                <SelectField label="Carro reserva" options={["Sim", "Não"]} />
                <SelectField label="Vidros" options={["Completo", "Para-brisa", "Não"]} />
                <SelectField label="Assistência 24h" options={["Sim", "Não"]} />
              </>
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              Voltar
            </Button>
            <Button onClick={next} className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
              {step === 2 ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Calcular
                </>
              ) : (
                "Próximo"
              )}
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Cotações encontradas</h2>
            <Button variant="outline" className="rounded-xl" onClick={recalc} disabled={calculating}>
              <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? "animate-spin" : ""}`} />
              Recalcular
            </Button>
          </div>

          {calculating ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : (
            showResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {quotes.map((q) => {
                  const winner = q.price === cheapest;
                  return (
                    <Card
                      key={q.insurer}
                      className={`p-5 rounded-2xl border shadow-none flex flex-col ${
                        winner ? "border-brand bg-brand/15" : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{q.insurer}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            <span className="text-xs">{q.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        {winner && (
                          <Badge className="bg-brand text-brand-foreground border-0">
                            <Trophy className="h-3 w-3 mr-1" /> Melhor
                          </Badge>
                        )}
                      </div>
                      <p className="mt-4 text-3xl font-bold tracking-tight">{formatBRL(q.price)}</p>
                      <p className="text-xs text-muted-foreground">/ ano</p>

                      <div className="mt-4 space-y-1.5">
                        {q.coverages.map((c) => (
                          <div key={c} className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-success" />
                            {c}
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs">
                        <span className="text-muted-foreground">Franquia</span>
                        <span className="font-semibold">{formatBRL(q.deductible)}</span>
                      </div>

                      <Button
                        className={`mt-4 w-full rounded-xl ${
                          winner
                            ? "bg-brand text-brand-foreground hover:bg-brand/90"
                            : "bg-foreground text-background hover:bg-foreground/90"
                        }`}
                        onClick={() => toast.success(`${q.insurer} selecionada`)}
                      >
                        Selecionar
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

function Field({ label, placeholder }: { label: string; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input placeholder={placeholder} className="mt-1.5 rounded-xl bg-muted border-0" />
    </div>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select defaultValue={options[0]}>
        <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
