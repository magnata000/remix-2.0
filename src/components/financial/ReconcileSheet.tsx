import { useMemo, useState, type ChangeEvent } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, MinusCircle, PlusCircle } from "lucide-react";
import { formatBRL, type Insurer } from "@/lib/mock/data";
import { MONTHS_PT } from "@/lib/cash/cashStore";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { toast } from "sonner";

const INSURERS: Insurer[] = ["Porto Seguro", "Bradesco", "SulAmérica", "Allianz", "Mapfre"];

type ParsedRow = { policyNumber: string; dueDate: string; amount: number; lineNumber: number };
type Decision = "accept_sheet" | "keep" | "mark_paid" | "ignore" | "create_manual";

type RowMatch = {
  key: string;
  sheet?: ParsedRow;
  commissionId?: string;
  commissionAmount?: number;
  commissionStatus?: string;
  clientName?: string;
  status: "match" | "diverge" | "extra" | "missing";
  decision: Decision;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  month: number;
  year: number;
};

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  // Detecta header
  const start = /apolice|policy|n[uú]mero/i.test(lines[0]) ? 1 : 0;
  const out: ParsedRow[] = [];
  for (let i = start; i < lines.length; i += 1) {
    const cells = lines[i].split(/[,;\t]/).map((c) => c.trim());
    if (cells.length < 3) continue;
    const [policyNumber, dueDate, amountRaw] = cells;
    const amount = Number(
      amountRaw.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")
    );
    if (!policyNumber || !Number.isFinite(amount)) continue;
    out.push({ policyNumber, dueDate, amount, lineNumber: i + 1 });
  }
  return out;
}

export function ReconcileSheet({ open, onOpenChange, month, year }: Props) {
  const { commissions, updateCommissionStatus, patchCommission } = useCommissionStore();
  const [insurer, setInsurer] = useState<Insurer>("Porto Seguro");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const monthCommissions = useMemo(
    () =>
      commissions.filter((c) => {
        if (c.insurer !== insurer) return false;
        const ref = c.paidAt ?? `${c.dueDate}T00:00:00`;
        const d = new Date(ref);
        return d.getMonth() === month && d.getFullYear() === year;
      }),
    [commissions, insurer, month, year],
  );

  const matches = useMemo<RowMatch[]>(() => {
    if (!parsed) return [];
    const out: RowMatch[] = [];
    const usedCommissionIds = new Set<string>();
    parsed.forEach((row) => {
      const cand = monthCommissions.find(
        (c) => c.policyNumber === row.policyNumber && !usedCommissionIds.has(c.id),
      );
      if (cand) {
        usedCommissionIds.add(cand.id);
        const diff = Math.abs(cand.amount - row.amount) > 0.01;
        out.push({
          key: `r-${row.lineNumber}`,
          sheet: row,
          commissionId: cand.id,
          commissionAmount: cand.amount,
          commissionStatus: cand.status,
          clientName: cand.clientName,
          status: diff ? "diverge" : "match",
          decision: diff ? "accept_sheet" : "mark_paid",
        });
      } else {
        out.push({
          key: `r-${row.lineNumber}`,
          sheet: row,
          status: "extra",
          decision: "create_manual",
        });
      }
    });
    monthCommissions.forEach((c) => {
      if (usedCommissionIds.has(c.id)) return;
      if (c.status === "pago" || c.status === "devolvido" || c.status === "cancelada") return;
      out.push({
        key: `c-${c.id}`,
        commissionId: c.id,
        commissionAmount: c.amount,
        commissionStatus: c.status,
        clientName: c.clientName,
        status: "missing",
        decision: "ignore",
      });
    });
    return out;
  }, [parsed, monthCommissions]);

  const decisionOf = (m: RowMatch): Decision => decisions[m.key] ?? m.decision;

  const summary = useMemo(() => {
    const counts = { match: 0, diverge: 0, extra: 0, missing: 0 };
    matches.forEach((m) => {
      counts[m.status] += 1;
    });
    return counts;
  }, [matches]);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const rows = parseCsv(text);
      setParsed(rows);
      setDecisions({});
      if (rows.length === 0) {
        toast.error("Não consegui ler nenhuma linha. Esperado: apolice,vencimento,valor");
      } else {
        toast.success(`${rows.length} linha(s) lida(s) de ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const apply = () => {
    let applied = 0;
    matches.forEach((m) => {
      const d = decisionOf(m);
      if (m.status === "match" && d === "mark_paid" && m.commissionId) {
        updateCommissionStatus(m.commissionId, "pago");
        applied += 1;
      } else if (m.status === "diverge" && m.commissionId) {
        if (d === "accept_sheet" && m.sheet) {
          patchCommission(m.commissionId, { amount: m.sheet.amount, status: "pago", paidAt: new Date().toISOString() });
          applied += 1;
        } else if (d === "mark_paid") {
          updateCommissionStatus(m.commissionId, "pago");
          applied += 1;
        }
      } else if (m.status === "missing" && d === "mark_paid" && m.commissionId) {
        updateCommissionStatus(m.commissionId, "pago");
        applied += 1;
      }
    });
    toast.success(`${applied} alteração(ões) aplicada(s)`);
    setParsed(null);
    setFileName("");
    setDecisions({});
    onOpenChange(false);
  };

  const statusBadge = (s: RowMatch["status"]) => {
    if (s === "match") return <Badge className="bg-success/15 text-success border-0 gap-1"><CheckCircle2 className="h-3 w-3" /> Match</Badge>;
    if (s === "diverge") return <Badge className="bg-warning/15 text-warning border-0 gap-1"><AlertTriangle className="h-3 w-3" /> Divergência</Badge>;
    if (s === "extra") return <Badge className="bg-brand/15 text-brand border-0 gap-1"><PlusCircle className="h-3 w-3" /> Extra</Badge>;
    return <Badge className="bg-muted text-muted-foreground border-0 gap-1"><MinusCircle className="h-3 w-3" /> Faltando</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Conciliação · {MONTHS_PT[month]} {year}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Faça upload da planilha de comissões da seguradora e revise as divergências antes de aplicar.
            Formato esperado (CSV): <code className="font-mono">apolice, vencimento, valor</code> — uma linha por parcela.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Seguradora</label>
              <Select value={insurer} onValueChange={(v) => { setInsurer(v as Insurer); setParsed(null); }}>
                <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
                <SelectContent>{INSURERS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Planilha</label>
              <label className="mt-1.5 flex items-center gap-2 cursor-pointer rounded-xl bg-muted px-3 py-2 text-sm hover:bg-muted/70">
                <Upload className="h-4 w-4" />
                <span className="truncate">{fileName || "Escolher arquivo .csv"}</span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
              </label>
            </div>
          </div>

          {parsed && (
            <>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl bg-success/10 p-2"><div className="text-lg font-bold text-success">{summary.match}</div><div className="text-[10px] uppercase text-muted-foreground">Match</div></div>
                <div className="rounded-xl bg-warning/10 p-2"><div className="text-lg font-bold text-warning">{summary.diverge}</div><div className="text-[10px] uppercase text-muted-foreground">Divergência</div></div>
                <div className="rounded-xl bg-brand/10 p-2"><div className="text-lg font-bold text-brand">{summary.extra}</div><div className="text-[10px] uppercase text-muted-foreground">Extra</div></div>
                <div className="rounded-xl bg-muted p-2"><div className="text-lg font-bold">{summary.missing}</div><div className="text-[10px] uppercase text-muted-foreground">Faltando</div></div>
              </div>

              <div className="rounded-xl border border-border divide-y divide-border text-xs">
                {matches.map((m) => {
                  const dec = decisionOf(m);
                  return (
                    <div key={m.key} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          {statusBadge(m.status)}
                          <span className="font-mono text-xs">{m.sheet?.policyNumber ?? m.clientName}</span>
                        </div>
                        <div className="text-right">
                          {m.sheet && (
                            <div><span className="text-muted-foreground">Planilha:</span> <span className="font-semibold">{formatBRL(m.sheet.amount)}</span></div>
                          )}
                          {m.commissionAmount !== undefined && (
                            <div><span className="text-muted-foreground">Sistema:</span> <span className="font-semibold">{formatBRL(m.commissionAmount)}</span> · {m.commissionStatus}</div>
                          )}
                        </div>
                      </div>
                      {m.status === "diverge" && (
                        <Select value={dec} onValueChange={(v) => setDecisions((p) => ({ ...p, [m.key]: v as Decision }))}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="accept_sheet">Aceitar valor da planilha</SelectItem>
                            <SelectItem value="mark_paid">Manter valor do sistema (marcar pago)</SelectItem>
                            <SelectItem value="keep">Não alterar</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {m.status === "missing" && (
                        <Select value={dec} onValueChange={(v) => setDecisions((p) => ({ ...p, [m.key]: v as Decision }))}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore">Ignorar (manter como está)</SelectItem>
                            <SelectItem value="mark_paid">Marcar como pago mesmo assim</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {m.status === "extra" && (
                        <div className="text-xs text-muted-foreground italic">
                          Não há comissão correspondente no sistema. (Criação manual ficará disponível em próxima iteração.)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => { setParsed(null); setFileName(""); }}>Descartar</Button>
                <Button className="rounded-full" onClick={apply}>Aplicar alterações</Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
