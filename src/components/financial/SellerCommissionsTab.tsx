import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Wallet } from "lucide-react";
import { formatBRL, type Branch } from "@/lib/mock/data";
import { useTeam } from "@/lib/team/teamStore";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { usePolicies } from "@/lib/portfolio/policyStore";
import { useSellerCommissionStore } from "@/lib/financial/sellerCommissionStore";
import { formatDateBR, MONTHS_PT } from "@/lib/cash/cashStore";

const BRANCHES: Branch[] = ["Auto", "Vida", "Residencial", "Empresarial", "Saúde", "Consórcio"];

export function SellerCommissionsTab() {
  const { members } = useTeam();
  const { commissions } = useCommissionStore();
  const { policies } = usePolicies();
  const { getRate, updateRate, computePayout } = useSellerCommissionStore();

  const sellers = useMemo(() => members.filter((m) => m.role === "Vendedor"), [members]);
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [sellerId, setSellerId] = useState<string>("");

  // Garante que sempre haja um vendedor selecionado válido
  useEffect(() => {
    if (sellers.length === 0) {
      if (sellerId) setSellerId("");
      return;
    }
    if (!sellers.some((s) => s.id === sellerId)) {
      setSellerId(sellers[0].id);
    }
  }, [sellers, sellerId]);

  const selectedSeller = sellers.find((s) => s.id === sellerId);

  const policyById = useMemo(() => {
    const m = new Map<string, (typeof policies)[number]>();
    policies.forEach((p) => m.set(p.id, p));
    return m;
  }, [policies]);

  // Comissões pagas no mês (fallback dueDate quando paidAt ausente)
  const paidThisMonth = useMemo(() => {
    return commissions.filter((c) => {
      if (c.status !== "pago") return false;
      const ref = c.paidAt ?? c.dueDate;
      if (!ref) return false;
      const d = new Date(ref);
      return d.getMonth() === month && d.getFullYear() === currentYear;
    });
  }, [commissions, month, currentYear]);

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
  const branchesServed = new Set(sellerHistory.map((r) => r.policy.branch)).size;

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
      {/* Filtro global */}
      <Card className="rounded-2xl border-border shadow-none p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Filtro global
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Toda a página reflete o vendedor e mês selecionados.
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Vendedor</Label>
              <Select value={sellerId || undefined} onValueChange={setSellerId}>
                <SelectTrigger className="h-9 w-[220px] rounded-full text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Mês</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="h-9 w-[140px] rounded-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_PT.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI do vendedor selecionado */}
      <Card className="rounded-2xl border-border shadow-none p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground font-medium">
          <Wallet className="h-3.5 w-3.5" />
          Total a repassar · {MONTHS_PT[month]} / {currentYear}
        </div>
        <div className="mt-2 text-3xl font-bold">{formatBRL(sellerTotal)}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {selectedSeller?.name ?? "—"} · {sellerHistory.length} comissão(ões) paga(s) ·{" "}
          {branchesServed} ramo(s) atendido(s)
        </div>
      </Card>

      {/* Configuração de % (apenas o vendedor selecionado) */}
      <Card className="rounded-2xl border-border shadow-none">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-semibold">Configuração de comissão (%)</h2>
          <p className="text-xs text-muted-foreground">
            Editando percentuais de{" "}
            <span className="font-medium text-foreground">{selectedSeller?.name ?? "—"}</span>.
            Aplicado à comissão recebida pela corretora, por ramo.
          </p>
        </div>
        <div className="overflow-x-auto px-5 pb-5">
          <Table>
            <TableHeader>
              <TableRow className="border-y border-border bg-muted/40">
                <TableHead className="text-xs">Vendedor</TableHead>
                {BRANCHES.map((b) => (
                  <TableHead key={b} className="text-xs text-center">
                    {b}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedSeller && (
                <TableRow>
                  <TableCell className="font-medium">{selectedSeller.name}</TableCell>
                  {BRANCHES.map((b) => (
                    <TableCell key={b} className="text-center">
                      <div className="relative inline-block">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={getRate(selectedSeller.id, b)}
                          onChange={(e) => updateRate(selectedSeller.id, b, Number(e.target.value))}
                          className="w-20 h-8 text-center pr-6 rounded-lg bg-muted border-0"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          %
                        </span>
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Histórico do vendedor selecionado */}
      <Card className="rounded-2xl border-border shadow-none">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-semibold">Histórico de comissões pagas</h2>
          <p className="text-xs text-muted-foreground">
            Comissões da corretora marcadas como pagas em {MONTHS_PT[month]} de {currentYear}.
          </p>
        </div>
        <div className="overflow-x-auto">
          {sellerHistory.length === 0 ? (
            <div className="px-5 pb-5">
              <div className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-xl">
                Nenhuma comissão paga para {selectedSeller?.name ?? "—"} em {MONTHS_PT[month]}.
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
                      {formatDateBR(r.commission.paidAt ?? r.commission.dueDate)}
                    </TableCell>
                    <TableCell className="text-sm">{r.commission.clientName}</TableCell>
                    <TableCell className="text-xs font-mono">{r.commission.policyNumber}</TableCell>
                    <TableCell className="text-xs">{r.policy.branch}</TableCell>
                    <TableCell className="text-right text-sm">
                      {formatBRL(r.commission.amount)}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {r.pct.toLocaleString("pt-BR")}%
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {formatBRL(r.payout)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40">
                  <TableCell colSpan={6} className="text-right font-semibold">
                    Total a repassar
                  </TableCell>
                  <TableCell className="text-right font-bold text-success">
                    {formatBRL(sellerTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
