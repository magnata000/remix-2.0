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
import { commissions, formatBRL } from "@/lib/mock/data";
import {
  useCashStore, formatDateTimeBR, MONTHS_PT,
  type Expense, type ExpenseEntry,
} from "@/lib/cash/cashStore";
import { NewExpenseSheet } from "@/components/financial/NewExpenseSheet";
import { NewIncomeDialog } from "@/components/financial/NewIncomeDialog";
import { RegisterEntryDialog } from "@/components/financial/RegisterEntryDialog";
import { MovementDetailsSheet, type Movement } from "@/components/financial/MovementDetailsSheet";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  pago: "bg-success/15 text-success border-0",
  pendente: "bg-warning/15 text-warning border-0",
  atrasado: "bg-destructive/15 text-destructive border-0",
};

export function CaixaTab() {
  const { expenses, entries, incomes, removeExpense } = useCashStore();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [openExpense, setOpenExpense] = useState(false);
  const [openIncome, setOpenIncome] = useState(false);
  const [registerFor, setRegisterFor] = useState<Expense | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  // (KPIs movidos para a aba Relatório)

  const inMonth = (iso: string) => {
    const d = new Date(iso);
    return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
  };

  // Movimentações unificadas
  const movements = useMemo<Movement[]>(() => {
    const inFromCommissions: Movement[] = commissions
      .filter((c) => c.status === "pago")
      .map((c) => ({
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
  }, [incomes, entries, expenses]);

  const monthMovements = movements.filter((m) => inMonth(m.date));

  const summary = useMemo(() => {
    const income = monthMovements.filter((m) => m.kind === "entrada").reduce((s, m) => s + m.amount, 0);
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
      {/* KPIs originais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpenIncome(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova entrada
          </Button>
        </div>
        {monthMovements.length === 0 ? (
          <div className="px-5 pb-5">
            <div className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-xl">
              Nenhuma movimentação neste mês.
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
                  <TableHead className="text-xs text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthMovements.map((m) => (
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
                    <TableCell className={`text-right font-semibold ${m.kind === "entrada" ? "text-success" : "text-destructive"}`}>
                      {m.kind === "entrada" ? "+" : "−"} {formatBRL(m.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Comissões (preservado) */}
      <Card className="rounded-2xl border-border shadow-none overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-semibold">Comissões</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-y border-border bg-muted/40">
                <th className="px-5 py-3 font-medium">Apólice</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Seguradora</th>
                <th className="px-5 py-3 font-medium">Valor</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3 font-mono text-xs">{c.policyNumber}</td>
                  <td className="px-5 py-3 font-medium">{c.clientName}</td>
                  <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{c.insurer}</td>
                  <td className="px-5 py-3 font-semibold">{formatBRL(c.amount)}</td>
                  <td className="px-5 py-3"><Badge className={statusColor[c.status]}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <NewExpenseSheet open={openExpense} onOpenChange={setOpenExpense} />
      <NewIncomeDialog open={openIncome} onOpenChange={setOpenIncome} />
      <RegisterEntryDialog expense={registerFor} open={registerFor !== null} onOpenChange={(o) => !o && setRegisterFor(null)} />
      <MovementDetailsSheet movement={selectedMovement} open={selectedMovement !== null} onOpenChange={(o) => !o && setSelectedMovement(null)} />
    </div>
  );
}
