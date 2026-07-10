import type { Commission } from "@/lib/mock/data";
import type { ExpenseEntry, ManualIncome, Expense, TaxEntry } from "@/lib/cash/cashStore";
import type { CategoryKind } from "@/lib/financial/dreConfigStore";

/** Verifica se um lançamento de imposto pertence ao período por competência (mês/ano). */
export function taxInRangeByCompetence(t: TaxEntry, r: DateRange): boolean {
  const compStart = new Date(t.competenceYear, t.competenceMonth, 1, 0, 0, 0).getTime();
  const compEnd = new Date(t.competenceYear, t.competenceMonth + 1, 0, 23, 59, 59).getTime();
  // considera o imposto no período se sua competência intersecta o range
  return compEnd >= r.start.getTime() && compStart <= r.end.getTime();
}

export type DateRange = { start: Date; end: Date };

export function inRange(iso: string | undefined, r: DateRange) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t <= r.end.getTime();
}

export function previousRange(r: DateRange): DateRange {
  const dur = r.end.getTime() - r.start.getTime();
  return { start: new Date(r.start.getTime() - dur - 1), end: new Date(r.start.getTime() - 1) };
}

export function rangePreset(preset: string, ref = new Date()): DateRange {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  switch (preset) {
    case "mes-anterior":
      return {
        start: startOfDay(new Date(y, m - 1, 1)),
        end: endOfDay(new Date(y, m, 0)),
      };
    case "ultimos-3":
      return {
        start: startOfDay(new Date(y, m - 2, 1)),
        end: endOfDay(new Date(y, m + 1, 0)),
      };
    case "ano":
      return { start: startOfDay(new Date(y, 0, 1)), end: endOfDay(new Date(y, 11, 31)) };
    case "ano-anterior":
      return { start: startOfDay(new Date(y - 1, 0, 1)), end: endOfDay(new Date(y - 1, 11, 31)) };
    case "mes":
    default:
      return {
        start: startOfDay(new Date(y, m, 1)),
        end: endOfDay(new Date(y, m + 1, 0)),
      };
  }
}

export function revenueBruta(
  commissions: Commission[],
  incomes: ManualIncome[],
  r: DateRange,
): number {
  const c = commissions
    .filter((x) => x.status === "pago" && inRange(x.paidAt, r))
    .reduce((s, x) => s + x.amount, 0);
  const i = incomes.filter((x) => inRange(x.receivedAt, r)).reduce((s, x) => s + x.amount, 0);
  return c + i;
}

export function expensesByCategory(entries: ExpenseEntry[], r: DateRange) {
  const map = new Map<string, number>();
  entries
    .filter((e) => inRange(e.paidAt, r))
    .forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
  return map;
}

export function expensesSplit(
  entries: ExpenseEntry[],
  r: DateRange,
  resolveKind: (entry: ExpenseEntry) => CategoryKind,
) {
  let custos = 0;
  let despesas = 0;
  const custosByCat = new Map<string, number>();
  const despesasByCat = new Map<string, number>();
  entries
    .filter((e) => inRange(e.paidAt, r))
    .forEach((e) => {
      const k = resolveKind(e);
      if (k === "custo_operacional") {
        custos += e.amount;
        custosByCat.set(e.category, (custosByCat.get(e.category) ?? 0) + e.amount);
      } else {
        despesas += e.amount;
        despesasByCat.set(e.category, (despesasByCat.get(e.category) ?? 0) + e.amount);
      }
    });
  return { custos, despesas, custosByCat, despesasByCat };
}

export type DreResult = {
  receitaBruta: number;
  devolucoes: number;
  impostosReceita: number;
  receitaLiquida: number;
  custos: number;
  lucroBruto: number;
  despesas: number;
  lucroOperacional: number;
  impostosLucro: number;
  lucroLiquido: number;
  margem: number;
  breakdown: {
    receita: { comissoes: number; manuais: number };
    custosByCat: Array<{ name: string; value: number }>;
    despesasByCat: Array<{ name: string; value: number }>;
  };
};

export type RevenueLosses = {
  canceladas: { valor: number; parcelas: number; clientes: number };
  devolvidas: { valor: number; parcelas: number; clientes: number };
  serieMensal: Array<{ month: string; canceladas: number; devolvidas: number }>;
};

export function revenueLosses(commissions: Commission[], r: DateRange): RevenueLosses {
  const canc = commissions.filter((c) => c.status === "cancelada" && inRange(c.dueDate, r));
  const dev = commissions.filter((c) => c.status === "devolvido" && inRange(c.refundedAt, r));

  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const serieMensal: Array<{ month: string; canceladas: number; devolvidas: number }> = [];
  const cur = new Date(r.start.getFullYear(), r.start.getMonth(), 1);
  const end = new Date(r.end.getFullYear(), r.end.getMonth(), 1);
  while (cur.getTime() <= end.getTime()) {
    const y = cur.getFullYear();
    const m = cur.getMonth();
    const canceladas = canc
      .filter((c) => {
        const d = new Date(c.dueDate);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .reduce((s, c) => s + c.amount, 0);
    const devolvidas = dev
      .filter((c) => {
        const d = new Date(c.refundedAt!);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .reduce((s, c) => s + c.amount, 0);
    serieMensal.push({ month: MONTHS[m], canceladas, devolvidas });
    cur.setMonth(cur.getMonth() + 1);
  }

  return {
    canceladas: {
      valor: canc.reduce((s, c) => s + c.amount, 0),
      parcelas: canc.length,
      clientes: new Set(canc.map((c) => c.clientName)).size,
    },
    devolvidas: {
      valor: dev.reduce((s, c) => s + c.amount, 0),
      parcelas: dev.length,
      clientes: new Set(dev.map((c) => c.clientName)).size,
    },
    serieMensal,
  };
}

export function computeDre(
  commissions: Commission[],
  incomes: ManualIncome[],
  entries: ExpenseEntry[],
  expenses: Expense[],
  taxes: TaxEntry[],
  r: DateRange,
  classify: (c: string) => CategoryKind,
): DreResult {
  const expenseMap = new Map(expenses.map((x) => [x.id, x]));
  const resolveKind = (entry: ExpenseEntry): CategoryKind => {
    const exp = expenseMap.get(entry.expenseId);
    if (exp?.dreKind) return exp.dreKind;
    return classify(entry.category);
  };
  const comissoes = commissions
    .filter((x) => x.status === "pago" && inRange(x.paidAt, r))
    .reduce((s, x) => s + x.amount, 0);
  const manuais = incomes.filter((x) => inRange(x.receivedAt, r)).reduce((s, x) => s + x.amount, 0);
  const receitaBruta = comissoes + manuais;
  const devolucoes = commissions
    .filter((x) => x.status === "devolvido" && inRange(x.refundedAt, r))
    .reduce((s, x) => s + x.amount, 0);
  const taxesInPeriod = taxes.filter((t) => taxInRangeByCompetence(t, r));
  const impostosReceita = taxesInPeriod
    .filter((t) => t.kind === "sobre_receita")
    .reduce((s, t) => s + t.amount, 0);
  const impostosLucro = taxesInPeriod
    .filter((t) => t.kind === "sobre_lucro")
    .reduce((s, t) => s + t.amount, 0);
  const receitaLiquida = receitaBruta - devolucoes - impostosReceita;
  const split = expensesSplit(entries, r, resolveKind);
  const lucroBruto = receitaLiquida - split.custos;
  const lucroOperacional = lucroBruto - split.despesas;
  const lucroLiquido = lucroOperacional - impostosLucro;
  const margem = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
  return {
    receitaBruta,
    devolucoes,
    impostosReceita,
    receitaLiquida,
    custos: split.custos,
    lucroBruto,
    despesas: split.despesas,
    lucroOperacional,
    impostosLucro,
    lucroLiquido,
    margem,
    breakdown: {
      receita: { comissoes, manuais },
      custosByCat: Array.from(split.custosByCat.entries()).map(([name, value]) => ({ name, value })),
      despesasByCat: Array.from(split.despesasByCat.entries()).map(([name, value]) => ({ name, value })),
    },
  };
}

export function projectedCashFlow(
  commissions: Commission[],
  expenses: Expense[],
  entries: ExpenseEntry[],
  incomes: ManualIncome[],
  reference = new Date(),
  horizonDays = 60,
) {
  const now = reference.getTime();
  const horizon = new Date(reference.getTime() + horizonDays * 86400000).getTime();
  const paidComm = commissions
    .filter((c) => c.status === "pago" && c.paidAt && new Date(c.paidAt).getTime() <= now)
    .reduce((s, c) => s + c.amount, 0);
  const manualIn = incomes
    .filter((i) => new Date(i.receivedAt).getTime() <= now)
    .reduce((s, i) => s + i.amount, 0);
  const paidOut = entries
    .filter((e) => new Date(e.paidAt).getTime() <= now)
    .reduce((s, e) => s + e.amount, 0);
  const saldoAtual = paidComm + manualIn - paidOut;

  const recebimentos = commissions
    .filter((c) => (c.status === "pendente" || c.status === "atrasado") && new Date(c.dueDate).getTime() > now && new Date(c.dueDate).getTime() <= horizon)
    .reduce((s, c) => s + c.amount, 0);

  // pagamentos futuros: recorrentes mensais projetados por dueDay dentro do horizonte
  let pagamentos = 0;
  const ref = new Date(reference);
  for (const e of expenses.filter((x) => x.recurrence === "mensal" && x.dueDay)) {
    for (let m = 0; m < Math.ceil(horizonDays / 30) + 1; m++) {
      const d = new Date(ref.getFullYear(), ref.getMonth() + m, e.dueDay!);
      const t = d.getTime();
      if (t > now && t <= horizon) pagamentos += e.amount;
    }
  }

  return {
    saldoAtual,
    recebimentos,
    pagamentos,
    saldoProjetado: saldoAtual + recebimentos - pagamentos,
  };
}

export function delinquency(commissions: Commission[], asOf = new Date()) {
  const atrasadas = commissions.filter((c) => c.status === "atrasado");
  const valorEmAberto = atrasadas.reduce((s, c) => s + c.amount, 0);
  const totalOpen = commissions
    .filter((c) => c.status === "atrasado" || c.status === "pendente")
    .reduce((s, c) => s + c.amount, 0);
  const pct = totalOpen > 0 ? (valorEmAberto / totalOpen) * 100 : 0;
  const clientes = new Set(atrasadas.map((c) => c.clientName)).size;

  // série mensal dos últimos 12 meses baseada em dueDate
  const y = asOf.getFullYear();
  const m = asOf.getMonth();
  const serieMensal: Array<{ month: string; value: number }> = [];
  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(y, m - i, 1);
    const label = MONTHS[dt.getMonth()];
    const value = atrasadas
      .filter((c) => {
        const d = new Date(c.dueDate);
        return d.getFullYear() === dt.getFullYear() && d.getMonth() === dt.getMonth();
      })
      .reduce((s, c) => s + c.amount, 0);
    serieMensal.push({ month: label, value });
  }

  return { valorEmAberto, pct, parcelas: atrasadas.length, clientes, serieMensal };
}

export function compareDelta(current: number, previous: number) {
  const delta = current - previous;
  const deltaPct = previous === 0 ? (current === 0 ? 0 : 100) : (delta / Math.abs(previous)) * 100;
  const trend: "up" | "down" | "flat" = Math.abs(deltaPct) < 0.01 ? "flat" : delta >= 0 ? "up" : "down";
  return { delta, deltaPct, trend };
}

export function monthlySeries(
  r: DateRange,
  fn: (start: Date, end: Date) => number,
): Array<{ month: string; value: number; key: string }> {
  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const out: Array<{ month: string; value: number; key: string }> = [];
  const cur = new Date(r.start.getFullYear(), r.start.getMonth(), 1);
  const end = new Date(r.end.getFullYear(), r.end.getMonth(), 1);
  while (cur.getTime() <= end.getTime()) {
    const monthStart = new Date(cur.getFullYear(), cur.getMonth(), 1, 0, 0, 0);
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59);
    out.push({
      month: MONTHS[cur.getMonth()],
      key: `${cur.getFullYear()}-${cur.getMonth() + 1}`,
      value: fn(monthStart, monthEnd),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

export function formatPct(n: number, digits = 2) {
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}
