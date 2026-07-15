import type { Opportunity } from "./opportunityStore";
import type { KanbanStage } from "@/lib/mock/data";
import { lostReasonLabel } from "@/lib/mock/data";

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const;

export type SalesMonthPoint = { month: string; vendas: number; receita: number };

export const STAGE_ORDER: KanbanStage[] = ["lead", "cotacao", "negociacao", "fechado", "perdido"];
const OPEN_STAGES: KanbanStage[] = ["lead", "cotacao", "negociacao"];

const MS_HOUR = 3_600_000;
const MS_DAY = 24 * MS_HOUR;

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

export type StageAnalytic = {
  stage: KanbanStage;
  currentCount: number;      // leads atualmente na etapa
  totalPassed: number;       // total de leads que já passaram pela etapa
  totalExited: number;       // total que já saiu
  avgHoursInStage: number;   // tempo médio (aberto ou fechado)
  lostFromHere: number;      // saíram desta etapa para "perdido"
  advancedFromHere: number;  // saíram desta etapa para próxima etapa (não perdido)
};

export type PipelineAnalytics = {
  totalCreated: number;
  won: number;
  lost: number;
  openCount: number;
  wonRevenue: number;
  lostRevenue: number;
  avgTicket: number;
  overallConversion: number;   // fechado / criados (0..1)
  bottleneckStage?: KanbanStage;
  worstLossStage?: KanbanStage;
  stages: StageAnalytic[];
  lossReasons: { reason: string; count: number }[];
  stageToStage: { from: KanbanStage; to: KanbanStage; rate: number }[]; // apenas etapas em ordem
  uniqueClientsWon: number;
};

export function computePipelineAnalytics(
  opportunities: Opportunity[],
  filter?: { from?: Date; to?: Date; assignee?: string },
): PipelineAnalytics {
  const filtered = opportunities.filter((o) => {
    if (filter?.assignee && o.assignee !== filter.assignee) return false;
    const created = new Date(o.createdAt);
    if (filter?.from && created < filter.from) return false;
    if (filter?.to && created > filter.to) return false;
    return true;
  });

  const totalCreated = filtered.length;
  const won = filtered.filter((o) => o.stage === "fechado").length;
  const lost = filtered.filter((o) => o.stage === "perdido").length;
  const openCount = filtered.filter((o) => OPEN_STAGES.includes(o.stage)).length;
  const wonOpps = filtered.filter((o) => o.stage === "fechado");
  const wonRevenue = wonOpps.reduce((s, o) => s + o.estimatedValue, 0);
  const lostRevenue = filtered.filter((o) => o.stage === "perdido").reduce((s, o) => s + o.estimatedValue, 0);
  const avgTicket = won > 0 ? wonRevenue / won : 0;
  const overallConversion = totalCreated > 0 ? won / totalCreated : 0;

  // Por etapa: percorre stageHistory
  const stageStats: Record<KanbanStage, StageAnalytic> = {} as Record<KanbanStage, StageAnalytic>;
  STAGE_ORDER.forEach((s) => {
    stageStats[s] = { stage: s, currentCount: 0, totalPassed: 0, totalExited: 0, avgHoursInStage: 0, lostFromHere: 0, advancedFromHere: 0 };
  });
  const durationSum: Record<KanbanStage, number> = { lead: 0, cotacao: 0, negociacao: 0, fechado: 0, perdido: 0 };
  const durationCount: Record<KanbanStage, number> = { lead: 0, cotacao: 0, negociacao: 0, fechado: 0, perdido: 0 };

  filtered.forEach((o) => {
    stageStats[o.stage].currentCount += 1;
    for (let i = 0; i < o.stageHistory.length; i++) {
      const seg = o.stageHistory[i];
      stageStats[seg.stage].totalPassed += 1;
      const start = new Date(seg.enteredAt).getTime();
      const end = seg.exitedAt ? new Date(seg.exitedAt).getTime() : Date.now();
      const hours = Math.max(0, (end - start) / MS_HOUR);
      durationSum[seg.stage] += hours;
      durationCount[seg.stage] += 1;
      if (seg.exitedAt) {
        stageStats[seg.stage].totalExited += 1;
        const next = o.stageHistory[i + 1];
        if (next) {
          if (next.stage === "perdido") stageStats[seg.stage].lostFromHere += 1;
          else stageStats[seg.stage].advancedFromHere += 1;
        }
      }
    }
  });
  STAGE_ORDER.forEach((s) => {
    stageStats[s].avgHoursInStage = durationCount[s] ? durationSum[s] / durationCount[s] : 0;
  });

  // Gargalo = etapa aberta com maior tempo médio
  let bottleneckStage: KanbanStage | undefined;
  let maxAvg = 0;
  OPEN_STAGES.forEach((s) => {
    if (stageStats[s].avgHoursInStage > maxAvg) {
      maxAvg = stageStats[s].avgHoursInStage;
      bottleneckStage = s;
    }
  });

  // Pior perda = etapa que mais leva a "perdido"
  let worstLossStage: KanbanStage | undefined;
  let maxLoss = 0;
  OPEN_STAGES.forEach((s) => {
    if (stageStats[s].lostFromHere > maxLoss) {
      maxLoss = stageStats[s].lostFromHere;
      worstLossStage = s;
    }
  });

  // Motivos de perda
  const reasonCounts = new Map<string, number>();
  filtered.forEach((o) => {
    if (o.stage === "perdido" && o.lostReason) {
      const label = lostReasonLabel[o.lostReason] ?? o.lostReason;
      reasonCounts.set(label, (reasonCounts.get(label) ?? 0) + 1);
    }
  });
  const lossReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  // Conversão etapa→próxima etapa (funil linear)
  const stageToStage: { from: KanbanStage; to: KanbanStage; rate: number }[] = [];
  for (let i = 0; i < OPEN_STAGES.length - 1; i++) {
    const from = OPEN_STAGES[i];
    const to = OPEN_STAGES[i + 1];
    const total = stageStats[from].totalPassed;
    const advanced = stageStats[to].totalPassed;
    stageToStage.push({ from, to, rate: total > 0 ? advanced / total : 0 });
  }
  // Conversão negociacao → fechado
  stageToStage.push({
    from: "negociacao",
    to: "fechado",
    rate: stageStats.negociacao.totalPassed > 0 ? stageStats.fechado.totalPassed / stageStats.negociacao.totalPassed : 0,
  });

  const uniqueClientsWon = new Set(wonOpps.map((o) => o.clientName)).size;

  return {
    totalCreated,
    won,
    lost,
    openCount,
    wonRevenue,
    lostRevenue,
    avgTicket,
    overallConversion,
    bottleneckStage,
    worstLossStage,
    stages: STAGE_ORDER.map((s) => stageStats[s]),
    lossReasons,
    stageToStage,
    uniqueClientsWon,
  };
}

export function formatHours(h: number): string {
  if (h <= 0) return "—";
  if (h < 24) return `${h.toFixed(1)}h`;
  const d = h / 24;
  if (d < 30) return `${d.toFixed(1)}d`;
  return `${(d / 30).toFixed(1)} meses`;
}


