/** Tipos e regras de apresentação do Dashboard (cálculos agregados vivem na RPC get_dashboard_analytics). */

export type BranchStat = { id: string; name: string; code: string; premio: number; apolices: number; clientes: number };
export type ChurnPoint = { month: string; canceladas: number; nao_renovadas: number; base: number; is_partial: boolean; has_history: boolean };
export type DashboardAnalytics = {
  kpis: { premio_total: number; apolices: number; clientes_unicos: number };
  by_branch: BranchStat[];
  churn: ChurnPoint[];
  renewal: { renovadas: number; aguardando: number; nao_renovadas: number; futuras: number; total: number };
  top_clients: { id: string; name: string; premio: number; codes: string[] }[];
};

export const BRANCH_PALETTE = 6;
export const OTHER_COLOR = "var(--branch-other)";

/** Cor fixa por ramo: derivada do branch_id (estável entre filtros e sessões). */
export function branchColor(branchId: string): string {
  let h = 0;
  for (let i = 0; i < branchId.length; i++) h = (h * 31 + branchId.charCodeAt(i)) >>> 0;
  return `var(--branch-${(h % BRANCH_PALETTE) + 1})`;
}

export const churnRate = (p: ChurnPoint) => (p.base > 0 ? ((p.canceladas + p.nao_renovadas) / p.base) * 100 : 0);

export const renewalRate = (r: DashboardAnalytics["renewal"]) =>
  r.total > 0 ? (r.renovadas / r.total) * 100 : 0;

/** Donut: até 5 maiores ramos + "Outros" (resto e fatias < 3%). */
export function donutSlices(branches: BranchStat[]) {
  const total = branches.reduce((s, b) => s + b.premio, 0);
  const sorted = [...branches].sort((a, b) => b.premio - a.premio);
  const main: { id: string; name: string; value: number; color: string }[] = [];
  let other = 0;
  for (const b of sorted) {
    if (main.length < 5 && total > 0 && b.premio / total >= 0.03) {
      main.push({ id: b.id, name: b.name, value: b.premio, color: branchColor(b.id) });
    } else other += b.premio;
  }
  if (other > 0) main.push({ id: "__other", name: "Outros", value: other, color: OTHER_COLOR });
  return { total, slices: main };
}

export function formatCompactBRL(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export const formatPct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
