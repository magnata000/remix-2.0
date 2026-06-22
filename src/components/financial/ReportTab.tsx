import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, AlertCircle, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { formatBRL } from "@/lib/mock/data";
import { useCashStore, MONTHS_PT } from "@/lib/cash/cashStore";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { usePipelineStore } from "@/lib/pipeline/opportunityStore";
import { salesByMonthFromPipeline } from "@/lib/pipeline/salesStats";

const PIE_COLORS = ["var(--brand)", "var(--warning)", "var(--success)", "var(--destructive)", "var(--primary)", "#8b5cf6", "#06b6d4"];

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function ReportTab() {
  const { entries, incomes } = useCashStore();
  const { opportunities } = usePipelineStore();
  const currentYear = new Date().getFullYear();
  const [pieMonth, setPieMonth] = useState<number>(new Date().getMonth());
  const [topBy, setTopBy] = useState<"clientes" | "seguradoras">("clientes");

  // 1) Fluxo de caixa mensal
  const cashFlow = useMemo(() => {
    return MONTHS_SHORT.map((label, m) => {
      const inMonth = (iso: string) => {
        const d = new Date(iso);
        return d.getMonth() === m && d.getFullYear() === currentYear;
      };
      const comIn = commissions
        .filter((c) => c.status === "pago" && inMonth(c.dueDate))
        .reduce((s, c) => s + c.amount, 0);
      const manualIn = incomes.filter((i) => inMonth(i.receivedAt)).reduce((s, i) => s + i.amount, 0);
      const out = entries.filter((e) => inMonth(e.paidAt)).reduce((s, e) => s + e.amount, 0);
      const entradas = comIn + manualIn;
      return { month: label, entradas, saidas: out, saldo: entradas - out };
    });
  }, [entries, incomes, currentYear]);

  // 2) Receita vs Comissões — derivado das oportunidades em "Fechado"
  const lineData = useMemo(
    () =>
      salesByMonthFromPipeline(opportunities, currentYear).map((s) => ({
        month: s.month,
        receita: s.receita,
        comissoes: Math.round(s.receita * 0.18),
      })),
    [opportunities, currentYear],
  );

  // 3) Saídas por categoria do mês
  const pieData = useMemo(() => {
    const inSelected = entries.filter((e) => {
      const d = new Date(e.paidAt);
      return d.getMonth() === pieMonth && d.getFullYear() === currentYear;
    });
    const map = new Map<string, number>();
    inSelected.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [entries, pieMonth, currentYear]);

  // 4) Top clientes / seguradoras
  const topData = useMemo(() => {
    const key = topBy === "clientes" ? "clientName" : "insurer";
    const map = new Map<string, number>();
    commissions.forEach((c) => {
      const k = c[key as "clientName" | "insurer"];
      map.set(k, (map.get(k) ?? 0) + c.amount);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [topBy]);

  // KPIs (movidos da aba Caixa)
  const totalCom = commissions.reduce((s, c) => s + c.amount, 0);
  const pendenteCom = commissions.filter((c) => c.status === "pendente").reduce((s, c) => s + c.amount, 0);
  const atrasadoCom = commissions.filter((c) => c.status === "atrasado").reduce((s, c) => s + c.amount, 0);
  const kpis = [
    { label: "Comissões a Receber", value: formatBRL(pendenteCom), icon: Clock, iconBg: "bg-warning/15", iconColor: "text-warning", highlight: true },
    { label: "Inadimplência", value: formatBRL(atrasadoCom), icon: AlertCircle, iconBg: "bg-destructive/15", iconColor: "text-destructive", highlight: false },
    { label: "Ticket Médio", value: formatBRL(totalCom / commissions.length), icon: BarChart3, iconBg: "bg-brand/30", iconColor: "text-brand-foreground", highlight: false },
  ];

  const tooltipStyle = {
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--card)",
    fontSize: 12,
  } as const;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className={`p-5 rounded-2xl border-border shadow-none ${k.highlight ? "bg-brand/15 border-brand/30" : "bg-card"}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight">{k.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${k.iconBg}`}>
                <k.icon className={`h-5 w-5 ${k.iconColor}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>


      {/* 1) Fluxo de caixa full-width */}
      <Card className="p-5 rounded-2xl border-border shadow-none">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Fluxo de Caixa Mensal</h2>
          <p className="text-xs text-muted-foreground">Entradas, saídas e saldo · {currentYear}</p>
        </div>
        <div className="h-72">
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
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 2) Receita vs Comissões */}
        <Card className="p-5 rounded-2xl border-border shadow-none">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Receita vs Comissões</h2>
            <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="receita" name="Receita" stroke="var(--brand)" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="comissoes" name="Comissões" stroke="var(--warning)" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 3) Saídas por categoria */}
        <Card className="p-5 rounded-2xl border-border shadow-none">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Saídas por Categoria</h2>
              <p className="text-xs text-muted-foreground">{MONTHS_PT[pieMonth]} · {currentYear}</p>
            </div>
            <Select value={String(pieMonth)} onValueChange={(v) => setPieMonth(Number(v))}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_PT.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="h-64">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-xl">
                Nenhuma saída neste mês.
              </div>
            ) : (
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

        {/* 4) Top clientes / seguradoras */}
        <Card className="p-5 rounded-2xl border-border shadow-none lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Top por Receita</h2>
              <p className="text-xs text-muted-foreground">Soma de comissões (todos os status)</p>
            </div>
            <Tabs value={topBy} onValueChange={(v) => setTopBy(v as "clientes" | "seguradoras")}>
              <TabsList>
                <TabsTrigger value="clientes">Clientes</TabsTrigger>
                <TabsTrigger value="seguradoras">Seguradoras</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="value" fill="var(--brand)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
