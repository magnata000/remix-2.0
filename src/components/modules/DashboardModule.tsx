import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import {
  ShieldCheck,
  UserPlus,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { policies, formatBRL } from "@/lib/mock/data";
import { usePipelineStore } from "@/lib/pipeline/opportunityStore";
import { salesByMonthFromPipeline, revenueInMonth } from "@/lib/pipeline/salesStats";

type Kpi = {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: typeof ShieldCheck;
  iconBg: string;
  iconColor: string;
  highlight?: boolean;
};

function buildKpis(receitaMes: number, vendasMes: number): Kpi[] {
  return [
    {
      label: "Apólices Ativas",
      value: "1.284",
      change: "+8,2%",
      positive: true,
      icon: ShieldCheck,
      iconBg: "bg-brand",
      iconColor: "text-brand-foreground",
      highlight: true,
    },
    {
      label: "Novos Clientes",
      value: "112",
      change: "+12,4%",
      positive: true,
      icon: UserPlus,
      iconBg: "bg-warning/15",
      iconColor: "text-warning",
    },
    {
      label: "Sinistros Abertos",
      value: "23",
      change: "-4,1%",
      positive: false,
      icon: AlertTriangle,
      iconBg: "bg-info/15",
      iconColor: "text-info",
    },
    {
      label: "Receita do Mês",
      value: formatBRL(receitaMes),
      change: `${vendasMes} vendas`,
      positive: true,
      icon: TrendingUp,
      iconBg: "bg-success/15",
      iconColor: "text-success",
    },
  ];
}

const statusColor: Record<string, string> = {
  ativa: "bg-success/15 text-success border-0",
  pendente: "bg-warning/15 text-warning border-0",
  vencida: "bg-destructive/15 text-destructive border-0",
  cancelada: "bg-muted text-muted-foreground border-0",
};

export function DashboardModule() {
  const [loading, setLoading] = useState(true);
  const { opportunities } = usePipelineStore();
  const now = new Date();
  const salesData = useMemo(
    () => salesByMonthFromPipeline(opportunities, now.getFullYear()),
    [opportunities, now.getFullYear()],
  );
  const receitaMes = useMemo(
    () => revenueInMonth(opportunities, now.getMonth(), now.getFullYear()),
    [opportunities, now.getMonth(), now.getFullYear()],
  );
  const vendasMes = salesData[now.getMonth()]?.vendas ?? 0;
  const kpis = useMemo(() => buildKpis(receitaMes, vendasMes), [receitaMes, vendasMes]);
  const currentMonthIdx = now.getMonth();
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resumo da sua carteira e performance comercial
          </p>
        </div>
        <Badge variant="outline" className="rounded-full bg-card">
          Este mês
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))
          : kpis.map((k) => (
              <Card
                key={k.label}
                className={`p-5 rounded-2xl border-border shadow-none ${
                  k.highlight ? "bg-brand/15 border-brand/30" : "bg-card"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight">{k.value}</p>
                    <div className="mt-2 flex items-center gap-1">
                      {k.positive ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          k.positive ? "text-success" : "text-destructive"
                        }`}
                      >
                        {k.change}
                      </span>
                      <span className="text-xs text-muted-foreground">vs mês anterior</span>
                    </div>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${k.iconBg}`}
                  >
                    <k.icon className={`h-5 w-5 ${k.iconColor}`} />
                  </div>
                </div>
              </Card>
            ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Performance chart */}
        <Card className="lg:col-span-2 p-5 rounded-2xl border-border shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Performance de Vendas</h2>
              <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
            </div>
            <Badge variant="outline" className="rounded-full">
              Anual
            </Badge>
          </div>
          {loading ? (
            <Skeleton className="h-72 rounded-xl" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByMonth} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatBRL(v)}
                  />
                  <Bar dataKey="receita" radius={[8, 8, 0, 0]}>
                    {salesByMonth.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 7 ? "var(--brand)" : "var(--muted)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Radial */}
        <Card className="p-5 rounded-2xl border-border shadow-none">
          <h2 className="text-lg font-semibold">Taxa de Renovação</h2>
          <p className="text-xs text-muted-foreground">Trimestre atual</p>
          {loading ? (
            <Skeleton className="h-72 rounded-xl mt-4" />
          ) : (
            <>
              <div className="h-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={[{ value: 78.4 }]}
                    startAngle={180}
                    endAngle={0}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={20} fill="var(--warning)" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
                  <span className="text-4xl font-bold text-brand">78,4%</span>
                  <span className="text-xs text-muted-foreground">renovadas</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Renovadas</p>
                  <p className="text-lg font-bold">428</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Perdidas</p>
                  <p className="text-lg font-bold">118</p>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Recent policies */}
      <Card className="p-5 rounded-2xl border-border shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Apólices Recentes</h2>
        </div>
        {loading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 font-medium">Número</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium hidden md:table-cell">Ramo</th>
                  <th className="px-5 py-3 font-medium hidden lg:table-cell">Seguradora</th>
                  <th className="px-5 py-3 font-medium">Prêmio</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {policies.slice(0, 6).map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 font-mono text-xs">{p.number}</td>
                    <td className="px-5 py-3 font-medium">{p.clientName}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">
                      {p.branch}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-muted-foreground">
                      {p.insurer}
                    </td>
                    <td className="px-5 py-3 font-semibold">{formatBRL(p.premium)}</td>
                    <td className="px-5 py-3">
                      <Badge className={statusColor[p.status]}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
