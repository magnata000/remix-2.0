import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowDownCircle, ArrowUpCircle,
  Plus, Receipt, Trash2, TrendingUp, TrendingDown, Scale,
} from "lucide-react";
import { formatBRL } from "@/lib/mock/data";
import {
  useCashStore, formatDateTimeBR, MONTHS_PT,
  type Expense,
} from "@/lib/cash/cashStore";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { NewExpenseSheet } from "@/components/financial/NewExpenseSheet";
import { NewIncomeDialog } from "@/components/financial/NewIncomeDialog";
import { RegisterEntryDialog } from "@/components/financial/RegisterEntryDialog";
import { MovementDetailsSheet, type Movement } from "@/components/financial/MovementDetailsSheet";
import { CommissionStatusMenu } from "@/components/financial/CommissionStatusMenu";
import { toast } from "sonner";

export function CaixaTab() {
  const { expenses, entries, incomes, removeExpense } = useCashStore();
  const { commissions } = useCommissionStore();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [openExpense, setOpenExpense] = useState(false);
  const [openIncome, setOpenIncome] = useState(false);
  const [registerFor, setRegisterFor] = useState<Expense | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "entrada" | "saida">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pago" | "pendente" | "atrasado" | "none">("all");

  const inMonth = (iso: string) => {
    const d = new Date(iso);
    return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
  };

  // Movimentações unificadas — TODAS as comissões (qualquer status) entram
  const movements = useMemo<Movement[]>(() => {
    const inFromCommissions: Movement[] = commissions.map((c) => ({
      id: `com-${c.id}`,
      kind: "entrada",
      date: c.dueDate,
      description: `Comissão · ${c.clientName} · ${c.insurer}`,
      amount: c.amount,
      details: { kind: "comissao", commission: c },
    }));
    const inFromManual: Movement[] = incomes.map((i) => ({
      id: `inc-${i.id}`,
      kind: "entrada",
      date: i.receivedAt,
      description: i.description,
      amount: i.amount,
      details: { kind: "manual", income: i },
    }));
    const out: Movement[] = entries.map((e) => ({
      id: `out-${e.id}`,
      kind: "saida",
      date: e.paidAt,
      description: e.description,
      amount: e.amount,
      details: { kind: "saida", entry: e, expense: expenses.find((x) => x.id === e.expenseId) },
    }));
    return [...inFromCommissions, ...inFromManual, ...out].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [commissions, incomes, entries, expenses]);

  const monthMovements = movements.filter((m) => inMonth(m.date));

  const filteredMonthMovements = useMemo(() => {
    return monthMovements.filter((m) => {
      if (typeFilter !== "all" && m.kind !== typeFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "none") {
          if (m.details.kind === "comissao") return false;
        } else {
          if (m.details.kind !== "comissao") return false;
          if (m.details.commission.status !== statusFilter) return false;
        }
      }
      return true;
    });
  }, [monthMovements, typeFilter, statusFilter]);

  const filtersActive = typeFilter !== "all" || statusFilter !== "all";

  // KPIs do mês: comissões só contam como entrada se status === "pago"
  const summary = useMemo(() => {
    const income = monthMovements
      .filter((m) => {
        if (m.kind !== "entrada") return false;
        if (m.details.kind === "comissao") return m.details.commission.status === "pago";
        return true;
      })
      .reduce((s, m) => s + m.amount, 0);
    const expense = monthMovements.filter((m) => m.kind === "saida").reduce((s, m) => s + m.amount, 0);
    return { income, expense, balance: income - expense };
  }, [monthMovements]);

  // Despesas visíveis no mês (regra spec)
  const visibleExpenses = useMemo(() => {
    const selectedIdx = currentYear * 12 + selectedMonth;
    return expenses.filter((exp) => {
      const created = new Date(exp.createdAt);
      const createdIdx = created.getFullYear() * 12 + created.getMonth();
      if (exp.recurrence === "mensal") return createdIdx <= selectedIdx;
      return created.getMonth() === selectedMonth && created.getFullYear() === currentYear;
    });
  }, [expenses, selectedMonth, currentYear]);

  const handleRemoveExpense = (e: Expense) => {
    removeExpense(e.id);
    toast.success(`"${e.description}" removida`);
  };

  return (
    <div className="space-y-5">
      {/* Resumo do mês */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 rounded-2xl border-border shadow-none bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Entradas · {MONTHS_PT[selectedMonth]}</span>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-bold text-success">{formatBRL(summary.income)}</div>
        </Card>
        <Card className="p-4 rounded-2xl border-border shadow-none bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Saídas · {MONTHS_PT[selectedMonth]}</span>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <div className="mt-2 text-2xl font-bold text-destructive">{formatBRL(summary.expense)}</div>
        </Card>
        <Card className="p-4 rounded-2xl border-border shadow-none bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Saldo · {MONTHS_PT[selectedMonth]}</span>
            <Scale className={`h-4 w-4 ${summary.balance >= 0 ? "text-success" : "text-destructive"}`} />
          </div>
          <div className={`mt-2 text-2xl font-bold ${summary.balance >= 0 ? "text-success" : "text-destructive"}`}>
            {formatBRL(summary.balance)}
          </div>
        </Card>
      </div>

      {/* Despesas cadastradas */}
      <Card className="rounded-2xl border-border shadow-none">
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 className="text-lg font-semibold">Despesas cadastradas</h2>
            <p className="text-xs text-muted-foreground">Visíveis em {MONTHS_PT[selectedMonth]}</p>
          </div>
          <Button size="sm" className="rounded-full" onClick={() => setOpenExpense(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova despesa
          </Button>
        </div>
        <div className="px-5 pb-5">
          {visibleExpenses.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-xl">
              Nenhuma despesa neste mês.
            </div>
          ) : (
            <div className="space-y-2">
              {visibleExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{exp.description}</span>
                      <Badge className="bg-muted text-muted-foreground border-0">{exp.category}</Badge>
                      {exp.recurrence === "mensal" ? (
                        <Badge className="bg-primary/10 text-primary border-0">Mensal · dia {exp.dueDay}</Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground border-0">Avulsa</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Valor base: {formatBRL(exp.amount)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Registrar pagamento" onClick={() => setRegisterFor(exp)}>
                      <Receipt className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" title="Excluir" onClick={() => handleRemoveExpense(exp)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Movimentações */}
      <Card className="rounded-2xl border-border shadow-none overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Movimentações</h2>
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="h-7 w-auto border-transparent bg-transparent text-xs text-muted-foreground gap-1 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS_PT.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="h-8 w-auto rounded-full text-xs gap-1 px-3">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-8 w-auto rounded-full text-xs gap-1 px-3">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
                <SelectItem value="none">Sem status</SelectItem>
              </SelectContent>
            </Select>
            {filtersActive && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full text-xs text-muted-foreground"
                onClick={() => { setTypeFilter("all"); setStatusFilter("all"); }}
              >
                Limpar
              </Button>
            )}
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpenIncome(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova entrada
            </Button>
          </div>
        </div>
        {filteredMonthMovements.length === 0 ? (
          <div className="px-5 pb-5">
            <div className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-xl">
              {monthMovements.length === 0 ? "Nenhuma movimentação neste mês." : "Nenhuma movimentação corresponde aos filtros."}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-y border-border bg-muted/40">
                  <TableHead className="text-xs">Data/Hora</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMonthMovements.map((m) => {
                  const isCommission = m.details.kind === "comissao";
                  const isUnpaidCommission = isCommission && m.details.kind === "comissao" && m.details.commission.status !== "pago";
                  return (
                    <TableRow key={m.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedMovement(m)}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTimeBR(m.date)}</TableCell>
                      <TableCell>
                        {m.kind === "entrada" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-xs">
                            <ArrowDownCircle className="h-3.5 w-3.5" /> Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-xs">
                            <ArrowUpCircle className="h-3.5 w-3.5" /> Saída
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{m.description}</TableCell>
                      <TableCell>
                        {m.details.kind === "comissao" ? (
                          <CommissionStatusMenu commission={m.details.commission} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          m.kind === "entrada"
                            ? isUnpaidCommission ? "text-muted-foreground" : "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {m.kind === "entrada" ? "+" : "−"} {formatBRL(m.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <NewExpenseSheet open={openExpense} onOpenChange={setOpenExpense} />
      <NewIncomeDialog open={openIncome} onOpenChange={setOpenIncome} />
      <RegisterEntryDialog expense={registerFor} open={registerFor !== null} onOpenChange={(o) => !o && setRegisterFor(null)} />
      <MovementDetailsSheet movement={selectedMovement} open={selectedMovement !== null} onOpenChange={(o) => !o && setSelectedMovement(null)} />
    </div>
  );
}
