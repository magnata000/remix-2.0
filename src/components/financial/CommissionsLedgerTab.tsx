import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/financial/KpiCard";
import { formatBRL } from "@/lib/mock/data";
import { MONTHS_PT } from "@/lib/cash/cashStore";
import { useTeam } from "@/lib/team/teamStore";
import {
  listFinanceCommissions,
  reconcileCommission,
  addCommissionEvent,
} from "@/lib/financial/financeiro.functions";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["commission_event_type"];
type Row = Awaited<ReturnType<typeof listFinanceCommissions>>[number];

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente", atrasado: "Atrasada", conciliada: "Conciliada", parcial: "Parcial",
  divergente: "Divergente", estornada: "Estornada", ajustada: "Ajustada", cancelada: "Cancelada",
  pago: "Paga", devolvido: "Devolvida",
};
const EVENT_LABEL: Record<EventType, string> = {
  comissao: "Comissão", bonificacao: "Bonificação", imposto: "Imposto", estorno_integral: "Estorno integral",
  estorno_parcial: "Estorno parcial", ajuste_positivo: "Ajuste positivo", ajuste_negativo: "Ajuste negativo",
  pagamento: "Recebimento",
};
const NEG_TYPES: EventType[] = ["imposto", "estorno_parcial", "estorno_integral", "ajuste_negativo"];
const POS_TYPES: EventType[] = ["bonificacao", "ajuste_positivo"];
const MANUAL_TYPES: EventType[] = [...NEG_TYPES, ...POS_TYPES];
const NEG_SET = new Set<EventType>(["imposto", "estorno_parcial", "estorno_integral", "ajuste_negativo"]);

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const ymd = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const r2 = (n: number) => Math.round(n * 100) / 100;
const sumEv = (c: Row, t: EventType) =>
  (c.commission_events ?? []).filter((e) => e.tipo === t).reduce((s, e) => s + Number(e.valor), 0);

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "conciliada" || s === "pago") return "default";
  if (s === "divergente" || s === "estornada" || s === "atrasado") return "destructive";
  if (s === "cancelada") return "outline";
  return "secondary";
}

export function CommissionsLedgerTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [status, setStatus] = useState("todos");
  const [insurer, setInsurer] = useState("todas");
  const [branch, setBranch] = useState("todos");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const from = `${year}-${pad(month + 1)}-01`;
  const to = `${year}-${pad(month + 1)}-${pad(lastDay(year, month))}`;
  const fetchFn = useServerFn(listFinanceCommissions);
  const queryKey = ["finance-commissions", from, to];
  const { data: rows = [], isLoading } = useQuery({ queryKey, queryFn: () => fetchFn({ data: { from, to } }) });

  const insurerName = (c: Row) => c.insurers?.name ?? "—";
  const branchName = (c: Row) => c.policies?.branches?.name ?? "—";
  const insurers = useMemo(() => [...new Set(rows.map(insurerName))].sort(), [rows]);
  const branches = useMemo(() => [...new Set(rows.map(branchName))].sort(), [rows]);

  const filtered = rows.filter(
    (c) =>
      (status === "todos" || c.status === status) &&
      (insurer === "todas" || insurerName(c) === insurer) &&
      (branch === "todos" || branchName(c) === branch) &&
      (!q || `${c.client_name} ${c.policy_number}`.toLowerCase().includes(q.toLowerCase())),
  );

  const kpi = useMemo(() => {
    let previsto = 0, recebido = 0, aReceber = 0, divergencias = 0, repasse = 0;
    for (const c of filtered) {
      if (c.status === "cancelada") continue;
      const prev = Number(c.valor_previsto ?? 0);
      const rec = sumEv(c, "pagamento");
      previsto += prev;
      recebido += rec;
      if (["pendente", "atrasado", "parcial"].includes(c.status)) aReceber += Math.max(0, prev - rec);
      if (c.status === "divergente") divergencias++;
      for (const p of c.commission_payouts ?? []) repasse += Number(p.valor_devido) - Number(p.valor_pago);
    }
    return { previsto, recebido, aReceber, divergencias, repasse };
  }, [filtered]);

  const open = rows.find((c) => c.id === openId) ?? null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Previsto" value={formatBRL(kpi.previsto)} loading={isLoading} />
        <KpiCard title="A receber" value={formatBRL(kpi.aReceber)} loading={isLoading} />
        <KpiCard title="Recebido" value={formatBRL(kpi.recebido)} loading={isLoading} />
        <KpiCard title="Divergências" value={String(kpi.divergencias)} loading={isLoading} hint="Comissões recebidas com diferença ainda sem motivo." />
        <KpiCard title="Repasse pendente" value={formatBRL(kpi.repasse)} loading={isLoading} />
      </div>

      <Card className="rounded-2xl border-border shadow-none p-4 flex flex-wrap gap-3 items-end">
        <Field label="Competência">
          <div className="flex gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS_PT.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" className="h-9 w-[90px]" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} />
          </div>
        </Field>
        <Field label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Seguradora">
          <Select value={insurer} onValueChange={setInsurer}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {insurers.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Ramo">
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Buscar">
          <Input className="h-9 w-[200px]" placeholder="Cliente ou apólice" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
      </Card>

      <Card className="rounded-2xl border-border shadow-none overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs">Cliente</TableHead>
              <TableHead className="text-xs">Apólice</TableHead>
              <TableHead className="text-xs">Seguradora · Ramo</TableHead>
              <TableHead className="text-xs">Competência</TableHead>
              <TableHead className="text-xs text-right">Previsto</TableHead>
              <TableHead className="text-xs text-right">Recebido</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                {isLoading ? "Carregando…" : "Nenhuma comissão nesta competência."}
              </TableCell></TableRow>
            )}
            {filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => setOpenId(c.id)}>
                <TableCell className="text-sm font-medium">{c.client_name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.policy_number}</TableCell>
                <TableCell className="text-xs">{insurerName(c)} · {branchName(c)}</TableCell>
                <TableCell className="text-xs">{ymd(c.competencia)}</TableCell>
                <TableCell className="text-right text-sm">{formatBRL(Number(c.valor_previsto ?? 0))}</TableCell>
                <TableCell className="text-right text-sm">{formatBRL(sumEv(c, "pagamento"))}</TableCell>
                <TableCell><Badge variant={statusVariant(c.status)}>{STATUS_LABEL[c.status] ?? c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length >= 1000 && (
          <p className="text-xs text-muted-foreground p-3">Mostrando as primeiras 1.000 comissões. Use os filtros para refinar.</p>
        )}
      </Card>

      <CommissionSheet row={open} onClose={() => setOpenId(null)} queryKey={queryKey} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CommissionSheet({ row, onClose, queryKey }: { row: Row | null; onClose: () => void; queryKey: unknown[] }) {
  const qc = useQueryClient();
  const { members } = useTeam();
  const reconcileFn = useServerFn(reconcileCommission);
  const eventFn = useServerFn(addCommissionEvent);
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<EventType | "">("");
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"reconcile" | "event">("reconcile");
  const valorRef = useRef<HTMLInputElement>(null);

  const reset = () => { setValor(""); setTipo(""); setMotivo(""); setMode("reconcile"); };
  const refresh = () => qc.invalidateQueries({ queryKey });

  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;

  const previsto = Number(row.valor_previsto ?? 0);
  const recebidoAntes = sumEv(row, "pagamento");
  const pendente = r2(previsto - recebidoAntes);
  const v = Number(valor.replace(",", "."));
  const diff = valor === "" ? 0 : r2(v - pendente);
  const options = diff < 0 ? NEG_TYPES : diff > 0 ? POS_TYPES : [];
  const terminal = ["conciliada", "estornada", "cancelada"].includes(row.status);
  const events = [...(row.commission_events ?? [])].sort((a, b) => a.criado_em.localeCompare(b.criado_em));

  const submit = async () => {
    if (busy) return;
    if (mode === "reconcile") {
      if (valor === "" || !(v >= 0)) return toast.error("Informe o valor recebido");
      if (diff !== 0 && tipo && tipo.startsWith("estorno") && !motivo.trim()) return toast.error("Estorno exige motivo");
      setBusy(true);
      try {
        const st = await reconcileFn({ data: { commissionId: row.id, valorRecebido: v, tipoDiferenca: diff !== 0 && tipo ? tipo : undefined, motivo: motivo || undefined } });
        toast.success(`Comissão ${STATUS_LABEL[String(st)]?.toLowerCase() ?? "atualizada"}`);
        reset(); refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao conciliar"); }
      finally { setBusy(false); }
    } else {
      if (!tipo) return toast.error("Escolha o tipo do lançamento");
      if (valor === "" || !(v > 0)) return toast.error("Informe o valor");
      if (tipo.startsWith("estorno") && !motivo.trim()) return toast.error("Estorno exige motivo");
      setBusy(true);
      try {
        await eventFn({ data: { commissionId: row.id, tipo, valor: v, motivo: motivo || undefined } });
        toast.success("Lançamento registrado");
        reset(); refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao lançar"); }
      finally { setBusy(false); }
    }
  };

  return (
    <Sheet open onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{row.client_name}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {row.policy_number} · {row.insurers?.name ?? "—"} · {row.policies?.branches?.name ?? "—"}
          </p>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
          <Info label="Base" value={formatBRL(Number(row.base_calculo ?? 0))} />
          <Info label="Percentual" value={`${Number(row.percentual ?? 0)}%`} />
          <Info label="Status" value={STATUS_LABEL[row.status] ?? row.status} />
          <Info label="Previsto" value={formatBRL(previsto)} />
          <Info label="Recebido" value={formatBRL(recebidoAntes)} />
          <Info label="Pendente" value={formatBRL(Math.max(0, pendente))} />
        </div>

        {!terminal && (
          <form
            className="mt-5 space-y-3 rounded-xl border border-border p-4"
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            onKeyDown={(e) => { if (e.key === "Escape") reset(); }}
          >
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={mode === "reconcile" ? "default" : "outline"} onClick={() => { setMode("reconcile"); setTipo(""); }}>Conciliar</Button>
              <Button type="button" size="sm" variant={mode === "event" ? "default" : "outline"} onClick={() => { setMode("event"); setTipo(""); }}>Lançamento avulso</Button>
            </div>
            {mode === "event" && (
              <Select value={tipo} onValueChange={(t) => setTipo(t as EventType)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Tipo do lançamento" /></SelectTrigger>
                <SelectContent>{MANUAL_TYPES.map((t) => <SelectItem key={t} value={t}>{EVENT_LABEL[t]}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <div className="space-y-1">
              <Label className="text-xs">{mode === "reconcile" ? "Valor recebido (Enter confirma)" : "Valor"}</Label>
              <div className="flex gap-2">
                <Input ref={valorRef} autoFocus inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
                {mode === "reconcile" && (
                  <Button type="button" variant="outline" onClick={() => { setValor(String(Math.max(0, pendente))); valorRef.current?.focus(); }}>= Pendente</Button>
                )}
              </div>
            </div>
            {mode === "reconcile" && valor !== "" && diff !== 0 && (
              <div className="space-y-1">
                <Label className="text-xs">
                  Diferença de {formatBRL(Math.abs(diff))} {diff < 0 ? "a menor" : "a maior"} — explique (sem motivo fica divergente)
                </Label>
                <Select value={tipo} onValueChange={(t) => setTipo(t as EventType)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Motivo da diferença" /></SelectTrigger>
                  <SelectContent>{options.map((t) => <SelectItem key={t} value={t}>{EVENT_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {(tipo || mode === "event") && (
              <Textarea rows={2} placeholder={tipo.startsWith("estorno") ? "Motivo (obrigatório)" : "Motivo / observação"} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            )}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando…" : "Confirmar"}</Button>
          </form>
        )}

        <h3 className="mt-6 mb-2 text-sm font-semibold">Histórico de eventos</h3>
        <ol className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="rounded-lg bg-muted/40 p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{EVENT_LABEL[e.tipo]}</span>
                <span className={NEG_SET.has(e.tipo) ? "text-destructive font-semibold" : "font-semibold"}>
                  {NEG_SET.has(e.tipo) ? "−" : ""}{formatBRL(Number(e.valor))}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(e.criado_em).toLocaleString("pt-BR")} · {e.criado_por ? members.find((m) => m.id === e.criado_por)?.name ?? "Usuário" : "Sistema"}
              </div>
              {(e.motivo || e.observacao) && <div className="text-xs mt-1">{e.motivo ?? e.observacao}</div>}
            </li>
          ))}
          {events.length === 0 && <li className="text-xs text-muted-foreground">Sem eventos.</li>}
        </ol>

        {(row.commission_installments ?? []).length > 1 && (
          <>
            <h3 className="mt-6 mb-2 text-sm font-semibold">Parcelas</h3>
            <div className="space-y-1 text-xs">
              {[...row.commission_installments].sort((a, b) => a.numero_parcela - b.numero_parcela).map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span>{p.numero_parcela}ª · {ymd(p.competencia)}</span>
                  <span>{formatBRL(Number(p.valor_previsto))} · {STATUS_LABEL[p.status] ?? p.status}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
