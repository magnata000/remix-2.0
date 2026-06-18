import type { Opportunity } from "./opportunityStore";

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const;

export type SalesMonthPoint = { month: string; vendas: number; receita: number };

/** Vendas e faturamento por mês, derivados das oportunidades em estágio "Fechado". */
export function salesByMonthFromPipeline(
  opportunities: Opportunity[],
  year: number = new Date().getFullYear(),
): SalesMonthPoint[] {
  const buckets = MONTHS_SHORT.map((m) => ({ month: m, vendas: 0, receita: 0 }));
  opportunities.forEach((o) => {
    if (o.stage !== "fechado" || !o.closedAt) return;
    const d = new Date(o.closedAt);
    if (d.getFullYear() !== year) return;
    const m = d.getMonth();
    buckets[m].vendas += 1;
    buckets[m].receita += o.estimatedValue;
  });
  return buckets;
}

/** Faturamento total das oportunidades fechadas no mês/ano informados. */
export function revenueInMonth(
  opportunities: Opportunity[],
  month: number = new Date().getMonth(),
  year: number = new Date().getFullYear(),
): number {
  return opportunities.reduce((sum, o) => {
    if (o.stage !== "fechado" || !o.closedAt) return sum;
    const d = new Date(o.closedAt);
    if (d.getMonth() !== month || d.getFullYear() !== year) return sum;
    return sum + o.estimatedValue;
  }, 0);
}
