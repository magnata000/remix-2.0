import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Table as TableIcon, GitBranch, Trophy } from "lucide-react";
import { useQuoteStore, QuoteRecord, computeDiff } from "@/lib/multicalc/quoteStore";
import { formatBRL, formatDate } from "@/lib/mock/data";
import { StatusBadge } from "./StatusBadge";

type Props = {
  selectedIds: string[];
  onBack: () => void;
};

export function QuoteCompare({ selectedIds, onBack }: Props) {
  const { records } = useQuoteStore();
  const [mode, setMode] = useState<"tabela" | "timeline">(
    typeof window !== "undefined" && window.innerWidth < 768 ? "timeline" : "tabela"
  );

  const versions = useMemo(() => {
    const list = records.filter((r) => selectedIds.includes(r.id));
    list.sort((a, b) => a.version - b.version);
    return list;
  }, [records, selectedIds]);

  if (versions.length < 2) {
    return (
      <Card className="p-10 rounded-2xl border-border shadow-none text-center text-sm text-muted-foreground">
        Selecione 2 ou mais versões no Histórico para comparar.
        <div className="mt-4">
          <Button variant="outline" className="rounded-xl" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Histórico
          </Button>
        </div>
      </Card>
    );
  }

  const branchSet = new Set(versions.map((v) => v.branch));
  if (branchSet.size > 1) {
    return (
      <Card className="p-10 rounded-2xl border-border shadow-none text-center text-sm">
        <p className="font-medium text-destructive">Não é possível comparar cotações de ramos diferentes.</p>
        <p className="text-muted-foreground mt-1">
          Ramos selecionados: {Array.from(branchSet).join(", ")}. Selecione versões do mesmo ramo.
        </p>
        <div className="mt-4">
          <Button variant="outline" className="rounded-xl" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Histórico
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-lg" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h2 className="text-lg font-semibold">Comparando {versions.length} versões</h2>
        </div>
        <div className="inline-flex rounded-xl bg-muted p-1">
          <button
            onClick={() => setMode("tabela")}
            className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition ${mode === "tabela" ? "bg-background shadow font-medium" : "text-muted-foreground"}`}
          >
            <TableIcon className="h-4 w-4" /> Tabela
          </button>
          <button
            onClick={() => setMode("timeline")}
            className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition ${mode === "timeline" ? "bg-background shadow font-medium" : "text-muted-foreground"}`}
          >
            <GitBranch className="h-4 w-4" /> Timeline
          </button>
        </div>
      </div>

      {mode === "tabela" ? <CompareTable versions={versions} /> : <CompareTimeline versions={versions} />}
    </div>
  );
}

const ROWS: { label: string; get: (v: QuoteRecord) => string }[] = [
  { label: "Cliente", get: (v) => v.formData.cliente.nome },
  { label: "Ramo", get: (v) => v.formData.objeto.tipo },
  { label: "Marca/Modelo", get: (v) => v.formData.objeto.marcaModelo },
  { label: "Ano", get: (v) => v.formData.objeto.ano },
  { label: "CEP", get: (v) => v.formData.objeto.cep },
  { label: "Terceiros", get: (v) => v.formData.coberturas.terceiros },
  { label: "Carro reserva", get: (v) => v.formData.coberturas.carroReserva },
  { label: "Vidros", get: (v) => v.formData.coberturas.vidros },
  { label: "Assistência 24h", get: (v) => v.formData.coberturas.assistencia24h },
];

function CompareTable({ versions }: { versions: QuoteRecord[] }) {
  const insurers = Array.from(new Set(versions.flatMap((v) => v.results.map((r) => r.insurer))));
  const cheapestByVersion = versions.map((v) => Math.min(...v.results.map((r) => r.price)));

  const isDiffRow = (row: typeof ROWS[number]) => {
    const vals = versions.map((v) => row.get(v));
    return new Set(vals).size > 1;
  };

  return (
    <Card className="rounded-2xl border-border shadow-none overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Campo</th>
              {versions.map((v) => (
                <th key={v.id} className="text-left px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <span>v{v.version}</span>
                    <span className="text-xs text-muted-foreground">{v.clientName}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-normal">{formatDate(v.createdAt)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const highlight = isDiffRow(row);
              return (
                <tr key={row.label} className="border-t border-border">
                  <td className="px-4 py-2.5 text-muted-foreground">{row.label}</td>
                  {versions.map((v) => (
                    <td key={v.id} className={`px-4 py-2.5 ${highlight ? "bg-warning/10 font-medium" : ""}`}>
                      {row.get(v) || "—"}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="border-t-2 border-border bg-muted/30">
              <td className="px-4 py-2.5 font-semibold text-muted-foreground" colSpan={versions.length + 1}>
                Preços por seguradora
              </td>
            </tr>
            {insurers.map((ins) => (
              <tr key={ins} className="border-t border-border">
                <td className="px-4 py-2.5 text-muted-foreground">{ins}</td>
                {versions.map((v, vi) => {
                  const r = v.results.find((x) => x.insurer === ins);
                  const isCheapest = r && r.price === cheapestByVersion[vi];
                  return (
                    <td key={v.id} className={`px-4 py-2.5 ${isCheapest ? "text-success font-semibold" : ""}`}>
                      {r ? formatBRL(r.price) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-brand/15">
              <td className="px-4 py-3 font-semibold flex items-center gap-1"><Trophy className="h-4 w-4" /> Melhor preço</td>
              {versions.map((v, vi) => (
                <td key={v.id} className="px-4 py-3 font-bold">
                  {formatBRL(cheapestByVersion[vi])}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CompareTimeline({ versions }: { versions: QuoteRecord[] }) {
  return (
    <div className="space-y-3">
      {versions.map((v, idx) => {
        const prev = idx > 0 ? versions[idx - 1] : null;
        const diffs = prev ? computeDiff(prev.formData, v.formData) : [];
        const cheapest = Math.min(...v.results.map((r) => r.price));
        const winner = v.results.find((r) => r.price === cheapest);
        const prevCheapest = prev ? Math.min(...prev.results.map((r) => r.price)) : cheapest;
        const delta = cheapest - prevCheapest;
        return (
          <Card key={v.id} className="rounded-2xl border-border shadow-none p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground font-bold">
                v{v.version}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{v.clientName}</span>
                  <Badge variant="outline" className="bg-muted border-0">{v.branch}</Badge>
                  <StatusBadge status={v.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(v.createdAt)} · por {v.createdBy}
                </p>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[11px] text-muted-foreground">Melhor preço</p>
                    <p className="text-xl font-bold tracking-tight">{formatBRL(cheapest)}</p>
                    <p className="text-[11px] text-muted-foreground">{winner?.insurer}</p>
                  </div>
                  {prev && (
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[11px] text-muted-foreground">vs versão anterior</p>
                      <p className={`text-xl font-bold tracking-tight ${delta > 0 ? "text-destructive" : delta < 0 ? "text-success" : ""}`}>
                        {delta > 0 ? "+" : ""}{formatBRL(delta)}
                      </p>
                    </div>
                  )}
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[11px] text-muted-foreground">Coberturas</p>
                    <p className="text-sm font-medium mt-1">
                      {v.formData.coberturas.terceiros} · {v.formData.coberturas.vidros}
                    </p>
                  </div>
                </div>
                {diffs.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">O que mudou:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {diffs.map((d) => (
                        <span key={d.field} className="inline-flex items-center gap-1 text-xs bg-warning/15 text-warning-foreground px-2 py-1 rounded-md">
                          <strong>{d.label}:</strong> <s className="opacity-60">{d.from || "—"}</s> → {d.to || "—"}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-3">
                    {idx === 0 ? "Versão inicial" : "Sem alterações de parâmetros"}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
