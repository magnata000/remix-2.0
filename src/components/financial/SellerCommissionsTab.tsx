import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import { formatBRL, type Branch } from "@/lib/mock/data";
import { useTeam } from "@/lib/team/teamStore";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { usePolicyStore } from "@/lib/portfolio/policyStore";
import { useSellerCommissionStore } from "@/lib/financial/sellerCommissionStore";
import { formatDateBR, MONTHS_PT } from "@/lib/cash/cashStore";

const BRANCHES: Branch[] = ["Auto", "Vida", "Residencial", "Empresarial", "Saúde", "Consórcio"];

export function SellerCommissionsTab() {
  const { members } = useTeam();
  const { commissions } = useCommissionStore();
  const { policies } = usePolicyStore();
  const { getRate, updateRate, computePayout } = useSellerCommissionStore();

  const sellers = useMemo(() => members.filter((m) => m.role === "Vendedor"), [members]);
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [sellerId, setSellerId] = useState<string>(sellers[0]?.id ?? "");

  const policyById = useMemo(() => {
    const m = new Map<string, typeof policies[number]>();
    policies.forEach((p) => m.set(p.id, p));
    return m;
  }, [policies]);

  // Comissões PAGAS no mês selecionado, agrupadas por vendedor
  const paidThisMonth = useMemo(() => {
    return commissions.filter((c) => {
      if (c.status !== "pago" || !c.paidAt) return false;
      const d = new Date(c.paidAt);
      return d.getMonth() === month && d.getFullYear() === currentYear;
    });
  }, [commissions, month, currentYear]);

  const totalsPerSeller = useMemo(() => {
    const map = new Map<string, number>();
    paidThisMonth.forEach((c) => {
      const p = c.policyId ? policyById.get(c.policyId) : undefined;
      if (!p?.assigneeId) return;
      map.set(p.assigneeId, (map.get(p.assigneeId) ?? 0) + computePayout(c, p));
    });
    return map;
  }, [paidThisMonth, policyById, computePayout]);

  const sellerHistory = useMemo(() => {
    if (!sellerId) return [];
    return paidThisMonth
      .map((c) => {
        const p = c.policyId ? policyById.get(c.policyId) : undefined;
        if (!p || p.assigneeId !== sellerId) return null;
        return {
          commission: c,
          policy: p,
          pct: getRate(sellerId, p.branch),
          payout: computePayout(c, p),
        };
      })
      .filter(Boolean) as Array<{
        commission: (typeof commissions)[number];
        policy: (typeof policies)[number];
        pct: number;
        payout: number;
      }>;
  }, [paidThisMonth, sellerId, policyById, getRate, computePayout, commissions, policies]);

  const sellerTotal = sellerHistory.reduce((s, r) => s + r.payout, 0);

  if (sellers.length === 0) {
    return (
      <Card className="rounded-2xl border-border shadow-none p-8 text-center">
        <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <h2 className="text-lg font-semibold">Nenhum vendedor cadastrado</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione membros com o papel "Vendedor" em Configurações para configurar repasses.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs por vendedor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sellers.map((s) => (
          <Card key={s.id} className="p-4 rounded-2xl border-border shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium truncate">{s.name}</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">{formatBRL(totalsPerSeller.get(s.id) ?? 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">A repassar · {MONTHS_PT[month]}</div>
          </Card>
        ))}
      </div>

      {/* Configuração de % */}
      <Card className="rounded-2xl border-border shadow-none">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-semibold">Configuração de comissão (%)</h2>
          <p className="text-xs text-muted-foreground">Percentual aplicado à comissão recebida pela corretora, por vendedor e ramo.</p>
        </div>
        <div className="overflow-x-auto px-5 pb-5">
          <Table>
            <TableHeader>
              <TableRow className="border-y border-border bg-muted/40">
                <TableHead className="text-xs">Vendedor</TableHead>
                {BRANCHES.map((b) => (
                  <TableHead key={b} className="text-xs text-center">{b}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  {BRANCHES.map((b) => (
                    <TableCell key={b} className="text-center">
                      <div className="relative inline-block">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={getRate(s.id, b)}
                          onChange={(e) => updateRate(s.id, b, Number(e.target.value))}
                          className="w-20 h-8 text-center pr-6 rounded-lg bg-muted border-0"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Histórico por vendedor */}
      <Card className="rounded-2xl border-border shadow-none">
        <div className="flex items-center justify-between p-5 pb-3 gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Histórico de comissões pagas</h2>
            <p className="text-xs text-muted-foreground">Comissões da corretora marcadas como pagas no mês.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger className="h-9 w-[200px] rounded-full text-sm"><SelectValue placeholder="Vendedor" /></SelectTrigger>
              <SelectContent>
                {sellers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-9 w-[140px] rounded-full text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_PT.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          {sellerHistory.length === 0 ? (
            <div className="px-5 pb-5">
              <div className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-xl">
                Nenhuma comissão paga deste vendedor em {MONTHS_PT[month]}.
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-y border-border bg-muted/40">
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Apólice</TableHead>
                  <TableHead className="text-xs">Ramo</TableHead>
                  <TableHead className="text-xs text-right">Comissão corretora</TableHead>
                  <TableHead className="text-xs text-center">%</TableHead>
                  <TableHead className="text-xs text-right">Repasse</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellerHistory.map((r) => (
                  <TableRow key={r.commission.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {r.commission.paidAt ? formatDateBR(r.commission.paidAt) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{r.commission.clientName}</TableCell>
                    <TableCell className="text-xs font-mono">{r.commission.policyNumber}</TableCell>
                    <TableCell className="text-xs">{r.policy.branch}</TableCell>
                    <TableCell className="text-right text-sm">{formatBRL(r.commission.amount)}</TableCell>
                    <TableCell className="text-center text-xs">{r.pct.toLocaleString("pt-BR")}%</TableCell>
                    <TableCell className="text-right font-semibold text-success">{formatBRL(r.payout)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40">
                  <TableCell colSpan={6} className="text-right font-semibold">Total a repassar</TableCell>
                  <TableCell className="text-right font-bold text-success">{formatBRL(sellerTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
