import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
} from "recharts";
import { formatBRL } from "@/lib/mock/data";
import { useCashStore, MONTHS_PT } from "@/lib/cash/cashStore";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { useDreConfig } from "@/lib/financial/dreConfigStore";
import {
  rangePreset,
  previousRange,
  revenueBruta,
  computeDre,
  projectedCashFlow,
  delinquency,
  compareDelta,
  monthlySeries,
  inRange,
  formatPct,
  type DateRange,
} from "@/lib/financial/reportMetrics";
import { KpiCard } from "@/components/financial/KpiCard";
import { DreTable } from "@/components/financial/DreTable";
import { ReportFilters, type PeriodPreset } from "@/components/financial/ReportFilters";

const PIE_COLORS = ["var(--brand)", "var(--warning)", "var(--success)", "var(--destructive)", "var(--primary)", "#8b5cf6", "#06b6d4"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
} as const;

function EmptyState({ label = "Sem dados no período." }: { label?: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-xl">
      {label}
    </div>
  );
}

export function ReportTab() {
  const { entries, incomes, expenses } = useCashStore();
  const { commissions } = useCommissionStore();
  const { taxOnRevenuePct, taxOnProfitPct, classify } = useDreConfig();

  const [preset, setPreset] = useState<PeriodPreset>("ano");
  const [range, setRange] = useState<DateRange>(() => rangePreset("ano"));

  const prevR = useMemo(() => previousRange(range), [range]);

  // KPIs
  const dreCur = useMemo(
    () => computeDre(commissions, incomes, entries, range, taxOnRevenuePct, taxOnProfitPct, classify),
    [commissions, incomes, entries, range, taxOnRevenuePct, taxOnProfitPct, classify],
  );
  const drePrev = useMemo(
    () => computeDre(commissions, incomes, entries, prevR, taxOnRevenuePct, taxOnProfitPct, classify),
    [commissions, incomes, entries, prevR, taxOnRevenuePct, taxOnProfitPct, classify],
  );
  const rbCmp = compareDelta(dreCur.receitaBruta, drePrev.receitaBruta);
  const rlCmp = compareDelta(dreCur.receitaLiquida, drePrev.receitaLiquida);
  const llCmp = compareDelta(dreCur.lucroLiquido, drePrev.lucroLiquido);
  const mgCmp = compareDelta(dreCur.margem, drePrev.margem);

  const projected = useMemo(
    () => projectedCashFlow(commissions, expenses, entries, incomes),
    [commissions, expenses, entries, incomes],
  );

  // Fluxo de caixa mensal (respeitando range)
  const cashFlow = useMemo(() => {
    return monthlySeries(range, (s, e) => 0).map((m, idx, arr) => {
      const start = new Date(range.start.getFullYear(), range.start.getMonth() + idx, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
      const r = { start, end };
      const entradas =
        commissions.filter((c) => c.status === "pago" && inRange(c.paidAt, r)).reduce((s, c) => s + c.amount, 0) +
        incomes.filter((i) => inRange(i.receivedAt, r)).reduce((s, i) => s + i.amount, 0);
      const saidas = entries.filter((e) => inRange(e.paidAt, r)).reduce((s, e) => s + e.amount, 0);
      return { month: m.month, entradas, saidas, saldo: entradas - saidas };
    });
  }, [range, commissions, incomes, entries]);

  // Receita prevista × realizada
  const previstaVsReal = useMemo(() => {
    return cashFlow.map((_, idx) => {
      const start = new Date(range.start.getFullYear(), range.start.getMonth() + idx, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
      const r = { start, end };
      const realizada = commissions
        .filter((c) => c.status === "pago" && inRange(c.paidAt, r))
        .reduce((s, c) => s + c.amount, 0);
      const prevista = commissions
        .filter((c) => c.status !== "cancelada" && c.status !== "devolvido" && inRange(c.dueDate, r))
        .reduce((s, c) => s + c.amount, 0);
      return { month: cashFlow[idx].month, prevista, realizada };
    });
  }, [cashFlow, commissions, range]);

  // Saídas por categoria (respeita filtro global)
  const pieData = useMemo(() => {
    const inSelected = entries.filter((e) => inRange(e.paidAt, range));
    const map = new Map<string, number>();
    inSelected.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [entries, range]);


  // Evolução das despesas
  const despesasEvol = useMemo(() => {
    return cashFlow.map((m, idx) => {
      const start = new Date(range.start.getFullYear(), range.start.getMonth() + idx, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
      const r = { start, end };
      const total = entries.filter((e) => inRange(e.paidAt, r)).reduce((s, e) => s + e.amount, 0);
      return { month: m.month, total };
    });
  }, [cashFlow, entries, range]);

  // Evolução financeira (receita e lucro no período)
  const evolucao = useMemo(() => {
    return cashFlow.map((m, idx) => {
      const start = new Date(range.start.getFullYear(), range.start.getMonth() + idx, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
      const r = { start, end };
      const receita = revenueBruta(commissions, incomes, r);
      const custos = entries.filter((e) => inRange(e.paidAt, r)).reduce((s, e) => s + e.amount, 0);
      const lucro = receita - custos;
      return { month: m.month, receita, lucro };
    });
  }, [cashFlow, commissions, incomes, entries, range]);


  // Inadimplência
  const del = useMemo(() => delinquency(commissions), [commissions]);

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <Card className="p-4 rounded-2xl border-border shadow-none">
        <ReportFilters
          preset={preset}
          range={range}
          onChange={(p, r) => {
            setPreset(p);
            setRange(r);
          }}
        />
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard
          title="Receita Bruta"
          value={formatBRL(dreCur.receitaBruta)}
          hint="Soma das comissões pagas e receitas manuais no período selecionado."
          deltaPct={rbCmp.deltaPct}
          trend={rbCmp.trend}
        />
        <KpiCard
          title="Receita Líquida"
          value={formatBRL(dreCur.receitaLiquida)}
          hint={`Receita Bruta menos impostos sobre receita (${formatPct(taxOnRevenuePct)}).`}
          deltaPct={rlCmp.deltaPct}
          trend={rlCmp.trend}
        />
        <KpiCard
          title="Lucro Líquido"
          value={formatBRL(dreCur.lucroLiquido)}
          hint="Lucro Operacional menos impostos sobre lucro."
          deltaPct={llCmp.deltaPct}
          trend={llCmp.trend}
        />
        <KpiCard
          title="Margem de Lucro"
          value={formatPct(dreCur.margem)}
          hint="Lucro Líquido ÷ Receita Bruta."
          deltaPct={mgCmp.deltaPct}
          trend={mgCmp.trend}
        />
        <KpiCard
          title="Fluxo de Caixa Projetado"
          value={formatBRL(projected.saldoProjetado)}
          hint="Saldo Atual + Recebimentos Futuros − Pagamentos Futuros (próximos 60 dias)."
          footer={
            <div className="space-y-0.5">
              <div>Saldo atual: <span className="tabular-nums font-medium text-foreground">{formatBRL(projected.saldoAtual)}</span></div>
              <div>+ Recebimentos: <span className="tabular-nums font-medium text-success">{formatBRL(projected.recebimentos)}</span></div>
              <div>− Pagamentos: <span className="tabular-nums font-medium text-destructive">{formatBRL(projected.pagamentos)}</span></div>
            </div>
          }
        />
      </div>

      {/* Fluxo de caixa mensal */}
      <Card className="p-5 rounded-2xl border-border shadow-none">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Fluxo de Caixa Mensal</h2>
          <p className="text-xs text-muted-foreground">Entradas, saídas e saldo no período</p>
        </div>
        <div className="h-72">
          {cashFlow.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="entradas" name="Entradas" stroke="var(--success)" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="saidas" name="Saídas" stroke="var(--destructive)" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="saldo" name="Saldo" stroke="var(--brand)" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* DRE */}
      <DreTable dre={dreCur} />

      {/* Receita Prevista × Realizada */}
      <Card className="p-5 rounded-2xl border-border shadow-none">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Receita Prevista × Realizada</h2>
          <p className="text-xs text-muted-foreground">
            Prevista considera comissões contratadas por vencimento; realizada, valores efetivamente recebidos.
          </p>
        </div>
        <div className="h-72">
          {previstaVsReal.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={previstaVsReal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="prevista" name="Prevista" stroke="var(--warning)" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="realizada" name="Realizada" stroke="var(--brand)" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Despesas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5 rounded-2xl border-border shadow-none">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Despesas por Categoria</h2>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </div>
          <div className="h-64">
            {pieData.length === 0 ? <EmptyState label="Nenhuma saída no período." /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5 rounded-2xl border-border shadow-none">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Evolução das Despesas</h2>
            <p className="text-xs text-muted-foreground">Total de saídas por mês no período</p>
          </div>
          <div className="h-64">
            {despesasEvol.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={despesasEvol} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="despArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                  <Area type="monotone" dataKey="total" name="Despesas" stroke="var(--destructive)" strokeWidth={2} fill="url(#despArea)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Evolução financeira */}
      <Card className="p-5 rounded-2xl border-border shadow-none">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Evolução Financeira</h2>
          <p className="text-xs text-muted-foreground">Receita e lucro por mês no período</p>
        </div>
        <div className="h-72">
          {evolucao.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="receita" name="Receita" stroke="var(--brand)" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="lucro" name="Lucro" stroke="var(--success)" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Inadimplência */}
      <Card className="p-5 rounded-2xl border-border shadow-none">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Inadimplência</h2>
          <p className="text-xs text-muted-foreground">Comissões com status atrasado</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <KpiCard title="Valor em Aberto" value={formatBRL(del.valorEmAberto)} hint="Soma das comissões com status Atrasado." />
          <KpiCard title="Inadimplência (%)" value={formatPct(del.pct)} hint="Valor em aberto ÷ (Atrasado + Pendente)." invertTrendColor />
          <KpiCard title="Parcelas em Atraso" value={String(del.parcelas)} hint="Número de comissões atrasadas." />
          <KpiCard title="Clientes Inadimplentes" value={String(del.clientes)} hint="Clientes distintos com pelo menos uma parcela atrasada." />
        </div>
        <div className="h-64">
          {del.serieMensal.every((s) => s.value === 0) ? <EmptyState label="Sem histórico de inadimplência." /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={del.serieMensal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="value" name="Em atraso" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
