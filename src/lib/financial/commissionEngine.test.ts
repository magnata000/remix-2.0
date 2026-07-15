import { describe, it, expect } from "vitest";
import type { Policy } from "@/lib/mock/data";
import {
  branchToProduct,
  commissionKindLabel,
  DEFAULT_AGENCIAMENTO,
  DEFAULT_RECORRENCIA,
  DEFAULT_TAX_RATE,
  expectedRecurrencesUntil,
  generateCommissionSchedule,
  type CommissionConfig,
} from "./commissionEngine";

function policy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: "p1",
    number: "APO-2026-0001",
    clientName: "Fulano",
    branch: "Auto",
    insurer: "Porto Seguro",
    premium: 1200,
    startDate: "2026-01-15",
    endDate: "2027-01-15",
    status: "ativa",
    ...overrides,
  };
}

function config(overrides: Partial<CommissionConfig> = {}): CommissionConfig {
  return {
    insurer: "Porto Seguro",
    product: "auto",
    comissaoLiquida: false,
    taxaImposto: DEFAULT_TAX_RATE,
    agenciamento: DEFAULT_AGENCIAMENTO,
    recorrenciaPct: DEFAULT_RECORRENCIA,
    pctMin: 0.1,
    pctMax: 0.25,
    defaultScheme: "esgotamento",
    ...overrides,
  };
}

describe("branchToProduct", () => {
  it("maps every branch", () => {
    expect(branchToProduct("Saúde")).toBe("saude");
    expect(branchToProduct("Consórcio")).toBe("consorcio");
    expect(branchToProduct("Auto")).toBe("auto");
    expect(branchToProduct("Vida")).toBe("auto");
    expect(branchToProduct("Residencial")).toBe("auto");
    expect(branchToProduct("Empresarial")).toBe("auto");
  });
});

describe("commissionKindLabel", () => {
  it("labels every kind", () => {
    expect(commissionKindLabel("agenciamento")).toBe("Agenciamento");
    expect(commissionKindLabel("recorrencia")).toBe("Recorrência");
    expect(commissionKindLabel("vitalicio")).toBe("Vitalício");
    expect(commissionKindLabel("esgotamento")).toBe("Adiantamento");
    expect(commissionKindLabel("parcela")).toBe("Parcelado");
    expect(commissionKindLabel("unica")).toBe("Única");
    expect(commissionKindLabel(undefined)).toBe("Comissão");
  });
});

describe("generateCommissionSchedule — cancelamento/vencimento", () => {
  it("returns [] for cancelada", () => {
    expect(generateCommissionSchedule(policy({ status: "cancelada" }), config())).toEqual([]);
  });
  it("returns [] for vencida", () => {
    expect(generateCommissionSchedule(policy({ status: "vencida" }), config())).toEqual([]);
  });
});

describe("generateCommissionSchedule — Auto", () => {
  it("esgotamento (default) → 1 parcela em start + 30 dias", () => {
    const p = policy({ commissionPct: 20 });
    const cfg = config();
    const [c] = generateCommissionSchedule(p, cfg);
    expect(c.kind).toBe("esgotamento");
    expect(c.installmentTotal).toBe(1);
    expect(c.amount).toBe(240); // 1200 * 0.20
    expect(c.dueDate).toBe("2026-02-14");
  });

  it("parcela → N parcelas iguais, soma = premium * pct", () => {
    const p = policy({
      commissionPct: 20,
      commissionScheme: "parcela",
      commissionInstallments: 4,
    });
    const list = generateCommissionSchedule(p, config());
    expect(list).toHaveLength(4);
    expect(list.every((c) => c.kind === "parcela")).toBe(true);
    expect(list.map((c) => c.installmentIndex)).toEqual([1, 2, 3, 4]);
    const total = list.reduce((sum, c) => sum + c.amount, 0);
    expect(total).toBeCloseTo(240, 2); // 1200 * 0.20
  });

  it("aplica imposto quando comissaoLiquida=true", () => {
    const p = policy({ commissionPct: 20 });
    const cfg = config({ comissaoLiquida: true, taxaImposto: 0.1 });
    const [c] = generateCommissionSchedule(p, cfg);
    // 1200 * 0.20 * (1 - 0.10) = 216
    expect(c.amount).toBe(216);
  });

  it("usa pctMax quando policy não define commissionPct", () => {
    const cfg = config({ pctMax: 0.15 });
    const [c] = generateCommissionSchedule(policy(), cfg);
    expect(c.amount).toBe(180); // 1200 * 0.15
  });
});

describe("generateCommissionSchedule — Saúde", () => {
  it("agenciamento → N parcelas mensais no schedule", () => {
    const p = policy({
      branch: "Saúde",
      premium: 1200,
      healthInitialValue: 500,
      commissionScheme: "agenciamento",
    });
    const cfg = config({ product: "saude", defaultScheme: "agenciamento" });
    const list = generateCommissionSchedule(p, cfg);
    expect(list).toHaveLength(DEFAULT_AGENCIAMENTO.length);
    expect(list.every((c) => c.kind === "agenciamento")).toBe(true);
    // Parcela 1: 500 * 1.0 = 500
    expect(list[0].amount).toBe(500);
    // Parcela 2: 500 * 0.5 = 250
    expect(list[1].amount).toBe(250);
    // Vencimentos incrementam 1 mês a partir de startDate
    expect(list[0].dueDate).toBe("2026-01-15");
    expect(list[1].dueDate).toBe("2026-02-15");
  });

  it("vitalício → [] (recorrência gerada à parte)", () => {
    const p = policy({ branch: "Saúde", commissionScheme: "vitalicio" });
    const cfg = config({ product: "saude", defaultScheme: "vitalicio" });
    expect(generateCommissionSchedule(p, cfg)).toEqual([]);
  });

  it("usa premium/12 quando healthInitialValue não é fornecido", () => {
    const p = policy({
      branch: "Saúde",
      premium: 1200,
      commissionScheme: "agenciamento",
    });
    const cfg = config({ product: "saude" });
    const [first] = generateCommissionSchedule(p, cfg);
    // Math.round(1200/12) * 1.0 = 100
    expect(first.amount).toBe(100);
  });
});

describe("generateCommissionSchedule — Consórcio", () => {
  it("emite 1 parcela única em start + 30 dias", () => {
    const p = policy({ branch: "Consórcio", premium: 10000, commissionPct: 2 });
    const cfg = config({ product: "consorcio" });
    const [c] = generateCommissionSchedule(p, cfg);
    expect(c.kind).toBe("unica");
    expect(c.installmentTotal).toBe(1);
    // 10000 * (2/100) = 200
    expect(c.amount).toBe(200);
    expect(c.dueDate).toBe("2026-02-14");
  });
});

describe("expectedRecurrencesUntil", () => {
  it("retorna [] para produtos não-saúde", () => {
    const out = expectedRecurrencesUntil(
      policy(),
      config(),
      new Date(2027, 0, 1),
      new Set(),
    );
    expect(out).toEqual([]);
  });

  it("retorna [] para apólice cancelada", () => {
    const p = policy({ branch: "Saúde", status: "cancelada" });
    const out = expectedRecurrencesUntil(
      p,
      config({ product: "saude" }),
      new Date(2027, 0, 1),
      new Set(),
    );
    expect(out).toEqual([]);
  });

  it("gera recorrências após o agenciamento até a data de referência", () => {
    const p = policy({
      branch: "Saúde",
      startDate: "2026-01-15",
      healthInitialValue: 500,
      commissionScheme: "agenciamento",
    });
    const cfg = config({
      product: "saude",
      defaultScheme: "agenciamento",
      recorrenciaPct: 0.03,
    });
    // Agenciamento = 4 meses → primeira recorrência: 2026-05-15
    // Referência: 2026-07-31 → deve emitir 3 recorrências (mai/jun/jul)
    const out = expectedRecurrencesUntil(p, cfg, new Date(2026, 6, 31), new Set());
    expect(out).toHaveLength(3);
    expect(out.every((c) => c.kind === "recorrencia")).toBe(true);
    // 500 * 0.03 = 15
    expect(out[0].amount).toBe(15);
    expect(out[0].dueDate).toBe("2026-05-15");
    expect(out[2].dueDate).toBe("2026-07-15");
  });

  it("ignora meses já existentes em existingDueDates", () => {
    const p = policy({
      branch: "Saúde",
      startDate: "2026-01-15",
      healthInitialValue: 500,
      commissionScheme: "agenciamento",
    });
    const cfg = config({ product: "saude", defaultScheme: "agenciamento" });
    const existing = new Set(["2026-05-15", "2026-06-15"]);
    const out = expectedRecurrencesUntil(p, cfg, new Date(2026, 6, 31), existing);
    expect(out).toHaveLength(1);
    expect(out[0].dueDate).toBe("2026-07-15");
  });

  it("vitalício começa em vitalicioStartInstallment", () => {
    const p = policy({
      branch: "Saúde",
      startDate: "2026-01-15",
      healthInitialValue: 500,
      commissionScheme: "vitalicio",
    });
    const cfg = config({
      product: "saude",
      defaultScheme: "vitalicio",
      vitalicioStartInstallment: 13, // começa após 12 meses
    });
    // Primeira recorrência vitalícia: 2026-01-15 + 12 meses = 2027-01-15
    const out = expectedRecurrencesUntil(p, cfg, new Date(2027, 0, 31), new Set());
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("vitalicio");
    expect(out[0].dueDate).toBe("2027-01-15");
  });
});
