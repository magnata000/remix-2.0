import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { Users, Wallet, HandCoins } from "lucide-react";
import { formatBRL, type Branch } from "@/lib/mock/data";
import { useTeam } from "@/lib/team/teamStore";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { usePolicies } from "@/lib/portfolio/policyStore";
import { useSellerCommissionStore } from "@/lib/financial/sellerCommissionStore";
import { useSellerPayoutStore } from "@/lib/financial/sellerPayoutStore";
import { formatDateBR, MONTHS_PT } from "@/lib/cash/cashStore";
import { PaySellerPayoutDialog } from "@/components/financial/PaySellerPayoutDialog";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSellerSales } from "@/lib/financial/financeiro.functions";

const BRANCHES: Branch[] = ["Auto", "Vida", "Residencial", "Empresarial", "Saúde", "Consórcio"];

export function SellerCommissionsTab() {
  const { members } = useTeam();
  const { commissions } = useCommissionStore();
  const { policies } = usePolicies();
  const { getRate, updateRate, computePayout } = useSellerCommissionStore();
  const { payouts, totalPaid } = useSellerPayoutStore();

  const sellers = useMemo(() => members.filter((m) => m.role === "vendedor"), [members]);
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [sellerId, setSellerId] = useState<string>("");
  const [payOpen, setPayOpen] = useState(false);

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

  const salesFn = useServerFn(listSellerSales);
  const { data: sales = [] } = useQuery({
    queryKey: ["seller-sales", sellerId],
    queryFn: async () => (await salesFn({ data: { userId: sellerId } })) ?? [],
    enabled: !!sellerId,
  });

  const policyById = useMemo(() => {
    const m = new Map<string, (typeof policies)[number]>();
    policies.forEach((p) => m.set(p.id, p));
    return m;
  }, [policies]);

  // Saldo devedor (all-time): soma dos repasses computados sobre comissões pagas do vendedor,
  // descontando o que já foi repassado.
  const owedAllTime = useMemo(() => {
    if (!sellerId) return 0;
    return commissions.reduce((sum, c) => {
      if (c.status !== "pago") return sum;
      const p = c.policyId ? policyById.get(c.policyId) : undefined;
      if (!p || p.assigneeId !== sellerId) return sum;
      return sum + computePayout(c, p);
    }, 0);
  }, [commissions, policyById, sellerId, computePayout]);

  const paidAllTime = sellerId ? totalPaid(sellerId) : 0;
  const balance = Math.max(0, Math.round((owedAllTime - paidAllTime) * 100) / 100);

  const commissionsCounted = useMemo(() => {
    if (!sellerId) return 0;
    return commissions.filter((c) => {
      if (c.status !== "pago") return false;
      const p = c.policyId ? policyById.get(c.policyId) : undefined;
      return !!p && p.assigneeId === sellerId;
    }).length;
  }, [commissions, policyById, sellerId]);

  // Histórico de repasses (filtrado por mês/ano e vendedor).
  const payoutHistory = useMemo(() => {
    if (!sellerId) return [];
    return payouts
      .filter((p) => {
        if (p.sellerId !== sellerId) return false;
        const d = new Date(p.paidAt);
        return d.getMonth() === month && d.getFullYear() === currentYear;
      })
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }, [payouts, sellerId, month, currentYear]);

  const historyTotal = payoutHistory.reduce((s, p) => s + p.amount, 0);

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
              Filtros
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              O vendedor afeta toda a página. O mês filtra apenas o histórico de repasses.
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
              <Label className="text-xs text-muted-foreground">Mês (histórico)</Label>
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

      {/* KPI Total a Repassar */}
      <Card className="rounded-2xl border-border shadow-none p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground font-medium">
              <Wallet className="h-3.5 w-3.5" />
              Total a repassar
            </div>
            <div className="mt-2 text-3xl font-bold">{formatBRL(balance)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {selectedSeller?.name ?? "—"} · Saldo devedor acumulado ·{" "}
              {commissionsCounted} comissão(ões) contabilizada(s)
            </div>
            {paidAllTime > 0 && (
              <div className="text-xs text-muted-foreground mt-0.5">
                Já repassado: {formatBRL(paidAllTime)} · Total gerado: {formatBRL(owedAllTime)}
              </div>
            )}
          </div>
          <Button
            className="rounded-full"
            onClick={() => setPayOpen(true)}
            disabled={!selectedSeller || balance <= 0}
          >
            <HandCoins className="h-4 w-4 mr-1.5" />
            Pagar
          </Button>
        </div>
      </Card>

      {/* Configuração de % */}
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

      {/* Vendas e repasses gerados */}
      <Card className="rounded-2xl border-border shadow-none">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-semibold">Vendas e repasses gerados</h2>
          <p className="text-xs text-muted-foreground">
            Apólices de {selectedSeller?.name ?? "—"} com repasse. O valor do repasse acompanha o
            que a corretora já recebeu da comissão.
          </p>
        </div>
        <div className="overflow-x-auto">
          {sales.length === 0 ? (
            <div className="px-5 pb-5">
              <div className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-xl">
                Nenhuma venda com repasse registrada.
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-y border-border bg-muted/40">
                  <TableHead className="text-xs">Competência</TableHead>
                  <TableHead className="text-xs">Apólice</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Ramo / Seguradora</TableHead>
                  <TableHead className="text-xs text-right">Comissão corretora</TableHead>
                  <TableHead className="text-xs text-right">% repasse</TableHead>
                  <TableHead className="text-xs text-right">Repasse liberado</TableHead>
                  <TableHead className="text-xs text-right">Já pago</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => {
                  const c = s.commissions;
                  const st = Number(s.valor_pago) >= Number(s.valor_devido) && Number(s.valor_devido) > 0
                    ? "Repassado"
                    : Number(s.valor_devido) > 0
                      ? "Liberado"
                      : "Aguardando seguradora";
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {c?.competencia ? formatDateBR(c.competencia) : "—"}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{c?.policy_number ?? "—"}</TableCell>
                      <TableCell className="text-sm">{c?.client_name ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c?.policies?.branches?.name ?? "—"} · {c?.insurers?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatBRL(Number(c?.valor_previsto ?? 0))}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {Number(s.percentual_repasse)}%
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {formatBRL(Number(s.valor_devido))}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatBRL(Number(s.valor_pago))}
                      </TableCell>
                      <TableCell className="text-xs">{st}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Histórico de repasses */}
      <Card className="rounded-2xl border-border shadow-none">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-semibold">Histórico de repasses</h2>
          <p className="text-xs text-muted-foreground">
            Repasses efetuados a {selectedSeller?.name ?? "—"} em {MONTHS_PT[month]} de{" "}
            {currentYear}.
          </p>
        </div>
        <div className="overflow-x-auto">
          {payoutHistory.length === 0 ? (
            <div className="px-5 pb-5">
              <div className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-xl">
                Nenhum repasse registrado neste mês.
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-y border-border bg-muted/40">
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Vendedor</TableHead>
                  <TableHead className="text-xs">Observações</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutHistory.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateBR(p.paidAt)}
                    </TableCell>
                    <TableCell className="text-sm">{selectedSeller?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      {formatBRL(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40">
                  <TableCell colSpan={3} className="text-right font-semibold">
                    Total no mês
                  </TableCell>
                  <TableCell className="text-right font-bold text-destructive">
                    {formatBRL(historyTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <PaySellerPayoutDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        seller={selectedSeller ? { id: selectedSeller.id, name: selectedSeller.name } : null}
        suggestedAmount={balance}
      />
    </div>
  );
}
