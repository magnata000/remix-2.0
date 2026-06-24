// Motor de geração de cronograma de comissões por produto.
// Função pura: dado uma Policy + CommissionConfig, devolve N parcelas.

import type { Commission, Insurer, Policy } from "@/lib/mock/data";

export type CommissionProduct = "saude" | "auto" | "consorcio";
export type CommissionScheme = "agenciamento" | "esgotamento" | "parcela" | "unica";

export type CommissionConfig = {
  insurer: Insurer;
  product: CommissionProduct;
  comissaoLiquida: boolean;
  taxaImposto: number;           // ex: 0.115 (11,5%)
  // Saúde
  agenciamento: number[];        // ex: [1.0, 0.5, 0.3, 0.2]
  recorrenciaPct: number;        // ex: 0.03
  // Auto
  pctMin: number;                // ex: 0.10
  pctMax: number;                // ex: 0.25
  defaultScheme: CommissionScheme;
};

export const DEFAULT_AGENCIAMENTO = [1.0, 0.5, 0.3, 0.2];
export const DEFAULT_RECORRENCIA = 0.03;
export const DEFAULT_TAX_RATE = 0.115;

export function branchToProduct(branch: Policy["branch"]): CommissionProduct {
  if (branch === "Saúde") return "saude";
  if (branch === "Consórcio") return "consorcio";
  return "auto"; // Auto, Vida, Residencial, Empresarial
}

const addMonthsIso = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};
const addDaysIso = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

function applyTax(value: number, config: CommissionConfig): number {
  const v = config.comissaoLiquida ? value * (1 - config.taxaImposto) : value;
  return Math.round(v * 100) / 100;
}

export type GenerateOpts = {
  /** Status inicial das parcelas geradas. Padrão: "pendente". */
  initialStatus?: Commission["status"];
};

/**
 * Gera o cronograma de parcelas fixas (não inclui recorrência saúde — essa é
 * gerada mês a mês por ensureRecurringForMonth).
 */
export function generateCommissionSchedule(
  policy: Policy,
  config: CommissionConfig,
  opts: GenerateOpts = {},
): Commission[] {
  if (policy.status === "cancelada" || policy.status === "vencida") return [];
  const status = opts.initialStatus ?? "pendente";
  const product = branchToProduct(policy.branch);
  const scheme: CommissionScheme = policy.commissionScheme ?? config.defaultScheme;

  const base = (): Pick<Commission, "policyNumber" | "clientName" | "insurer" | "policyId"> => ({
    policyNumber: policy.number,
    clientName: policy.clientName,
    insurer: policy.insurer,
    policyId: policy.id,
  });

  // ---- Saúde: Agenciamento (recorrência é gerada à parte) ----
  if (product === "saude") {
    const schedule = policy.agenciamentoSchedule ?? config.agenciamento;
    const mensalidade = policy.healthInitialValue ?? Math.round(policy.premium / 12);
    return schedule.map((pct, i) => ({
      id: `c-${policy.id}-ag${i + 1}-${newId()}`,
      ...base(),
      amount: applyTax(mensalidade * pct, config),
      dueDate: addMonthsIso(policy.startDate, i),
      status,
      kind: "agenciamento",
      installmentIndex: i + 1,
      installmentTotal: schedule.length,
    }));
  }

  // ---- Consórcio: modelo provisório (1 comissão única) ----
  if (product === "consorcio") {
    const pct = policy.commissionPct ?? 1.5; // % default conservador
    return [
      {
        id: `c-${policy.id}-un-${newId()}`,
        ...base(),
        amount: applyTax(policy.premium * (pct / 100), config),
        dueDate: addDaysIso(policy.startDate, 30),
        status,
        kind: "unica",
        installmentTotal: 1,
        installmentIndex: 1,
      },
    ];
  }

  // ---- Auto / Vida / Residencial / Empresarial ----
  const pct = (policy.commissionPct ?? config.pctMax * 100) / 100;
  const totalBruto = policy.premium * pct;

  if (scheme === "parcela") {
    const n = Math.max(1, policy.commissionInstallments ?? 1);
    const each = totalBruto / n;
    return Array.from({ length: n }, (_, i) => ({
      id: `c-${policy.id}-pc${i + 1}-${newId()}`,
      ...base(),
      amount: applyTax(each, config),
      dueDate: addMonthsIso(policy.startDate, i),
      status,
      kind: "parcela",
      installmentIndex: i + 1,
      installmentTotal: n,
    }));
  }

  // esgotamento (default auto)
  return [
    {
      id: `c-${policy.id}-es-${newId()}`,
      ...base(),
      amount: applyTax(totalBruto, config),
      dueDate: addDaysIso(policy.startDate, 30),
      status,
      kind: "esgotamento",
      installmentIndex: 1,
      installmentTotal: 1,
    },
  ];
}

/**
 * Para uma apólice de Saúde, devolve as parcelas de recorrência que deveriam
 * existir até o mês de referência (inclusive), começando logo após o
 * agenciamento.
 */
export function expectedRecurrencesUntil(
  policy: Policy,
  config: CommissionConfig,
  reference: Date,
  existingDueDates: Set<string>,
  opts: GenerateOpts = {},
): Commission[] {
  if (branchToProduct(policy.branch) !== "saude") return [];
  if (policy.status === "cancelada" || policy.status === "vencida") return [];
  const status = opts.initialStatus ?? "pendente";
  const schedule = policy.agenciamentoSchedule ?? config.agenciamento;
  const recorrPct = policy.recorrenciaPct ?? config.recorrenciaPct;
  const mensalidade = policy.healthInitialValue ?? Math.round(policy.premium / 12);
  const amount = applyTax(mensalidade * recorrPct, config);

  const start = new Date(policy.startDate);
  const firstRecurrenceMonth = new Date(start);
  firstRecurrenceMonth.setMonth(firstRecurrenceMonth.getMonth() + schedule.length);

  const out: Commission[] = [];
  let cursor = new Date(firstRecurrenceMonth);
  let i = 1;
  while (
    cursor.getFullYear() < reference.getFullYear() ||
    (cursor.getFullYear() === reference.getFullYear() && cursor.getMonth() <= reference.getMonth())
  ) {
    const due = cursor.toISOString().slice(0, 10);
    if (!existingDueDates.has(due)) {
      out.push({
        id: `c-${policy.id}-re${i}-${newId()}`,
        policyNumber: policy.number,
        clientName: policy.clientName,
        insurer: policy.insurer,
        policyId: policy.id,
        amount,
        dueDate: due,
        status,
        kind: "recorrencia",
        installmentIndex: i,
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
    i += 1;
  }
  return out;
}

export function commissionKindLabel(kind?: Commission["kind"]): string {
  switch (kind) {
    case "agenciamento": return "Agenciamento";
    case "recorrencia": return "Recorrência";
    case "esgotamento": return "Esgotamento";
    case "parcela": return "Parcela";
    case "unica": return "Única";
    default: return "Comissão";
  }
}
