import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Wallet, Clock, AlertCircle, BarChart3 } from "lucide-react";
import { commissions, salesByMonth, formatBRL, formatDateShort } from "@/lib/mock/data";


const statusColor: Record<string, string> = {
  pago: "bg-success/15 text-success border-0",
  pendente: "bg-warning/15 text-warning border-0",
  atrasado: "bg-destructive/15 text-destructive border-0",
};

const lineData = salesByMonth.map((s) => ({
  month: s.month,
  receita: s.receita,
  comissoes: Math.round(s.receita * 0.18),
}));

export function FinancialModule() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const total = commissions.reduce((s, c) => s + c.amount, 0);
  const pago = commissions.filter((c) => c.status === "pago").reduce((s, c) => s + c.amount, 0);
  const pendente = commissions
    .filter((c) => c.status === "pendente")
    .reduce((s, c) => s + c.amount, 0);
  const atrasado = commissions
    .filter((c) => c.status === "atrasado")
    .reduce((s, c) => s + c.amount, 0);

  const kpis = [
    {
      label: "Comissões a Receber",
      value: formatBRL(pendente),
      icon: Clock,
      iconBg: "bg-warning/15",
      iconColor: "text-warning",
      highlight: true,
    },
    {
      label: "Recebido no Mês",
      value: formatBRL(pago),
      icon: Wallet,
      iconBg: "bg-success/15",
      iconColor: "text-success",
    },
    {
      label: "Inadimplência",
      value: formatBRL(atrasado),
      icon: AlertCircle,
      iconBg: "bg-destructive/15",
      iconColor: "text-destructive",
    },
    {
      label: "Ticket Médio",
      value: formatBRL(total / commissions.length),
      icon: BarChart3,
      iconBg: "bg-brand/30",
      iconColor: "text-brand-foreground",
    },
  ];

  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">Comissões, recebimentos e fluxo de caixa</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
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
                    <p className="mt-2 text-2xl font-bold tracking-tight">{k.value}</p>
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

      <Card className="p-5 rounded-2xl border-border shadow-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Receita vs Comissões</h2>
            <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatBRL(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="var(--brand)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "var(--brand)" }}
                />
                <Line
                  type="monotone"
                  dataKey="comissoes"
                  name="Comissões"
                  stroke="var(--warning)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "var(--warning)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="rounded-2xl border-border shadow-none overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-semibold">Comissões</h2>
        </div>
        {loading ? (
          <div className="p-5">
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-y border-border bg-muted/40">
                  <th className="px-5 py-3 font-medium">Apólice</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium hidden md:table-cell">Seguradora</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Vencimento</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 font-mono text-xs">{c.policyNumber}</td>
                    <td className="px-5 py-3 font-medium">{c.clientName}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">
                      {c.insurer}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                      {formatDateShort(c.dueDate)}
                    </td>
                    <td className="px-5 py-3 font-semibold">{formatBRL(c.amount)}</td>
                    <td className="px-5 py-3">
                      <Badge className={statusColor[c.status]}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
    </ComingSoonOverlay>
  );
}
