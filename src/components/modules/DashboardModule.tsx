import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar, BarChart, Cell, LabelList, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Table2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientDetailDrawer } from "@/components/portfolio/ClientDetailDrawer";
import { getDashboardAnalytics } from "@/lib/dashboard/dashboard.functions";
import {
  branchColor, churnRate, donutSlices, formatCompactBRL, formatPct, renewalRate, type DashboardAnalytics,
} from "@/lib/dashboard/analytics";
import { formatBRL } from "@/lib/mock/data";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function DashboardModule() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const fetchFn = useServerFn(getDashboardAnalytics);

  const q = useQuery({
    queryKey: ["dashboard-analytics", year, month, branchId],
    queryFn: () => fetchFn({ data: { year, month, branchId } }),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const data = q.data;
  const branches = data?.by_branch ?? [];
  const branchName = branches.find((b) => b.id === branchId)?.name;
  const toggleBranch = (id: string) => id !== "__other" && setBranchId((cur) => (cur === id ? null : id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão analítica da carteira e da retenção.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3].map((d) => <SelectItem key={d} value={String(now.getFullYear() - d)}>{now.getFullYear() - d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={branchId ?? "all"} onValueChange={(v) => setBranchId(v === "all" ? null : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Ramo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ramos</SelectItem>
              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {branchName && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setBranchId(null)}>
              Ramo: {branchName} <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      </div>

      {q.isError ? (
        <Card className="p-6 text-sm text-destructive">Não foi possível carregar o Dashboard. {(q.error as Error).message}</Card>
      ) : !data ? (
        <div className="grid gap-4 md:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <DashboardBody data={data} branchId={branchId} onBranch={toggleBranch} onClient={setClientName} />
      )}

      <ClientDetailDrawer clientName={clientName} onOpenChange={(o) => !o && setClientName(null)} />
    </div>
  );
}

function DashboardBody({
  data, branchId, onBranch, onClient,
}: { data: DashboardAnalytics; branchId: string | null; onBranch: (id: string) => void; onClient: (n: string) => void }) {
  // Meses sem histórico registrado ficam sem ponto (null) em vez de um 0% enganoso.
  const churn = data.churn.map((p) => ({
    ...p, rate: p.has_history ? churnRate(p) : null, label: MONTHS[Number(p.month.slice(5)) - 1],
  }));
  const tracked = churn.filter((p) => p.rate !== null) as (typeof churn[number] & { rate: number })[];
  const cur = churn[churn.length - 1];
  const prev = churn[churn.length - 2];
  const delta = cur?.rate != null && prev?.rate != null ? cur.rate - prev.rate : null;
  const avg = tracked.length ? tracked.reduce((s, p) => s + p.rate, 0) / tracked.length : 0;
  const r = data.renewal;
  const fade = (id: string) => (branchId && branchId !== id ? 0.3 : 1);
  const donut = useMemo(() => donutSlices(data.by_branch), [data.by_branch]);
  const byApolices = [...data.by_branch].sort((a, b) => b.apolices - a.apolices);
  const byClientes = [...data.by_branch].sort((a, b) => b.clientes - a.clientes);
  const topSum = data.top_clients.reduce((s, c) => s + c.premio, 0);
  const topPct = data.kpis.premio_total > 0 ? (topSum / data.kpis.premio_total) * 100 : 0;
  const top1 = data.top_clients[0]?.premio ?? 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Kpi label="Total em prêmios" value={formatCompactBRL(data.kpis.premio_total)} />
        <Kpi label="Apólices ativas" value={data.kpis.apolices.toLocaleString("pt-BR")} />
        <Kpi label="Clientes únicos" value={data.kpis.clientes_unicos.toLocaleString("pt-BR")} />
        <Kpi
          label="Taxa de churn"
          value={cur?.rate != null ? formatPct(cur.rate) : "—"}
          hint={cur?.rate != null
            ? `${cur.canceladas + cur.nao_renovadas} perdidas (${cur.canceladas} canc. + ${cur.nao_renovadas} não ren.)`
            : "Sem histórico neste mês"}
          delta={delta === null ? undefined : (
            <span className={`inline-flex items-center gap-0.5 ${delta > 0 ? "text-destructive" : "text-success"}`}>
              {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {delta > 0 ? "+" : "−"}{Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.
            </span>
          )}
        />
        <Kpi label="Taxa de renovação" value={formatPct(renewalRate(r))}
          hint={`${r.renovadas} de ${r.total} apólices${r.futuras ? ` · ${r.futuras} a vencer` : ""}`} />
      </div>

      <Section title="Carteira" subtitle="Fotografia de hoje">
        <ChartCard className="lg:col-span-4" title="Prêmios por ramo" table={donut.slices.map((s) => [s.name, formatBRL(s.value)])}>
          {donut.slices.length === 0 ? <Empty /> : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative h-48 w-48 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donut.slices} dataKey="value" innerRadius={55} outerRadius={85} startAngle={90} endAngle={-270} stroke="none"
                      onClick={(s: { id: string }) => onBranch(s.id)}>
                      {donut.slices.map((s) => <Cell key={s.id} fill={s.color} opacity={fade(s.id)} className="cursor-pointer" />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold">{formatCompactBRL(donut.total)}</div>
              </div>
              <ul className="w-full space-y-1 text-xs">
                {donut.slices.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="flex-1 truncate">{s.name}</span>
                    <span className="text-muted-foreground">{formatPct(donut.total ? (s.value / donut.total) * 100 : 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>

        <ChartCard className="lg:col-span-4" title="Apólices por ramo" table={byApolices.map((b) => [b.name, String(b.apolices)])}>
          {byApolices.length === 0 ? <Empty /> : (
            <ResponsiveContainer height={220}>
              <BarChart data={byApolices} margin={{ top: 20 }}>
                <XAxis dataKey="code" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip formatter={(v: number) => [v, "Apólices"]} labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ""} />
                <Bar dataKey="apolices" radius={[4, 4, 0, 0]} onClick={(d: { id: string }) => onBranch(d.id)} className="cursor-pointer">
                  {byApolices.map((b) => <Cell key={b.id} fill={branchColor(b.id)} opacity={fade(b.id)} />)}
                  <LabelList dataKey="apolices" position="top" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard className="lg:col-span-4" title="Clientes por ramo" footer="Um cliente pode aparecer em mais de um ramo."
          table={byClientes.map((b) => [b.name, String(b.clientes)])}>
          {byClientes.length === 0 ? <Empty /> : (
            <ResponsiveContainer height={Math.max(160, byClientes.length * 28)}>
              <BarChart data={byClientes} layout="vertical" margin={{ right: 30 }}>
                <XAxis type="number" hide domain={[0, "auto"]} />
                <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip formatter={(v: number) => [v, "Clientes"]} />
                <Bar dataKey="clientes" radius={[0, 4, 4, 0]} onClick={(d: { id: string }) => onBranch(d.id)} className="cursor-pointer">
                  {byClientes.map((b) => <Cell key={b.id} fill={branchColor(b.id)} opacity={fade(b.id)} />)}
                  <LabelList dataKey="clientes" position="right" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </Section>

      <Section title="Retenção" subtitle="O que estou perdendo e mantendo">
        <ChartCard className="lg:col-span-7" title="Churn — últimos 12 meses"
          footer={tracked.length < churn.length ? "Meses sem ponto ainda não tinham histórico registrado no sistema." : undefined}
          table={churn.map((p) => [p.month, p.rate === null ? "sem histórico" : `${formatPct(p.rate)} (${p.canceladas} canc. / ${p.nao_renovadas} não ren. / base ${p.base})`])}>
          <ResponsiveContainer height={240}>
            <LineChart data={churn} margin={{ top: 20, right: 20 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis domain={[0, "auto"]} tickFormatter={(v: number) => `${v}%`} width={40} fontSize={11} tickLine={false} axisLine={false} />
              {tracked.length > 1 && <ReferenceLine y={avg} stroke="var(--muted-foreground)" strokeDasharray="4 4" />}
              <Tooltip content={<ChurnTooltip />} />
              <Line dataKey="rate" stroke="var(--destructive)" strokeWidth={2} connectNulls={false}
                dot={(props: { cx: number; cy: number; index: number; value: number | null; payload: { is_partial: boolean } }) =>
                  props.value == null ? <g key={props.index} /> : (
                  <circle key={props.index} cx={props.cx} cy={props.cy} r={props.index === churn.length - 1 ? 5 : 3}
                    fill={props.payload.is_partial ? "var(--card)" : "var(--destructive)"} stroke="var(--destructive)" strokeWidth={2} />
                )} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard className="lg:col-span-5" title="Renovação no período"
          footer={r.futuras > 0 ? `Mês em andamento: ${r.futuras} apólice(s) ainda vencem. Exclui Saúde e Consórcio.` : "Exclui Saúde e Consórcio."}
          table={[["Renovadas", String(r.renovadas)], ["Vencidas aguardando", String(r.aguardando)], ["Não renovadas", String(r.nao_renovadas)], ["A vencer no mês", String(r.futuras)]]}>
          {r.total === 0 ? <Empty /> : (
            <div className="space-y-3 pt-6">
              <div className="flex h-10 w-full overflow-hidden rounded-md">
                {([["Renovadas", r.renovadas, "bg-info text-info-foreground"], ["Aguardando", r.aguardando, "bg-destructive text-destructive-foreground"], ["Não renovadas", r.nao_renovadas, "bg-muted-foreground text-background"], ["A vencer", r.futuras, "bg-muted text-muted-foreground"]] as const)
                  .filter(([, v]) => v > 0)
                  .map(([l, v, cls]) => (
                    <div key={l} className={`flex items-center justify-center text-xs font-medium ${cls}`} style={{ width: `${(v / r.total) * 100}%` }} title={l}>
                      {v} · {formatPct((v / r.total) * 100)}
                    </div>
                  ))}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <Legend cls="bg-info" label="Renovadas" /><Legend cls="bg-destructive" label="Vencidas aguardando" /><Legend cls="bg-muted-foreground" label="Não renovadas" /><Legend cls="bg-muted" label="A vencer no mês" />
              </div>
            </div>
          )}
        </ChartCard>
      </Section>

      <Section title="Clientes-chave" subtitle={`Top 10 = ${formatPct(topPct)} do prêmio total`}>
        <Card className="overflow-x-auto p-0 lg:col-span-12">
          {data.top_clients.length === 0 ? <div className="p-6"><Empty /></div> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="p-3 w-10">#</th><th className="p-3">Cliente</th><th className="p-3 hidden md:table-cell">Ramos</th>
                  <th className="p-3">Prêmio total</th><th className="p-3 text-right">% carteira</th>
                </tr>
              </thead>
              <tbody>
                {data.top_clients.map((c, i) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer" onClick={() => onClient(c.name)}>
                    <td className="p-3 text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 hidden md:table-cell"><div className="flex gap-1">{c.codes.map((k) => <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>)}</div></td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-muted"><div className="h-2 rounded-full bg-brand" style={{ width: `${top1 ? (c.premio / top1) * 100 : 0}%` }} /></div>
                        <span>{formatBRL(c.premio)}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">{formatPct(data.kpis.premio_total ? (c.premio / data.kpis.premio_total) * 100 : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </Section>
    </>
  );
}

function Kpi({ label, value, hint, delta }: { label: string; value: string; hint?: string; delta?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      {(hint || delta) && <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">{delta}{hint}</div>}
    </Card>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-12">{children}</div>
    </section>
  );
}

function ChartCard({ title, footer, table, className, children }: {
  title: string; footer?: string; table: string[][]; className?: string; children: React.ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card className={`p-4 ${className ?? ""}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setAsTable((v) => !v)}>
          <Table2 className="h-3.5 w-3.5" />{asTable ? "Ver gráfico" : "Ver como tabela"}
        </Button>
      </div>
      {asTable ? (
        <table className="w-full text-xs">
          <tbody>{table.map((row, i) => <tr key={i} className="border-b border-border last:border-0">{row.map((c, j) => <td key={j} className={`py-1.5 ${j ? "text-right" : ""}`}>{c}</td>)}</tr>)}</tbody>
        </table>
      ) : children}
      {footer && <p className="mt-2 text-xs text-muted-foreground">{footer}</p>}
    </Card>
  );
}

function ChurnTooltip({ active, payload }: { active?: boolean; payload?: { payload: { month: string; rate: number | null; canceladas: number; nao_renovadas: number; base: number; is_partial: boolean } }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="rounded-md border border-border bg-popover p-2 text-xs shadow-sm">
      <div className="font-semibold">{p.month}{p.is_partial ? " (parcial)" : ""}</div>
      <div>Churn: {p.rate === null ? "sem histórico" : formatPct(p.rate)}</div>
      <div>Canceladas: {p.canceladas} · Não renovadas: {p.nao_renovadas}</div>
      <div>Base no início do mês: {p.base}</div>
    </div>
  );
}

const Legend = ({ cls, label }: { cls: string; label: string }) => (
  <span className="inline-flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-sm ${cls}`} />{label}</span>
);
const Empty = () => <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</p>;
