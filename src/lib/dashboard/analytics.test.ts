import { describe, expect, it } from "vitest";
import { churnRate, donutSlices, renewalRate } from "./analytics";

describe("dashboard analytics", () => {
  it("churn = (canceladas + não renovadas) / base", () => {
    expect(churnRate({ month: "2026-10", canceladas: 2, nao_renovadas: 1, base: 100, is_partial: false, has_history: true })).toBe(3);
  });
  it("renovação = renovadas / elegíveis", () => {
    expect(renewalRate({ renovadas: 8, aguardando: 1, nao_renovadas: 1, futuras: 0, total: 10 })).toBe(80);
  });
  it("donut agrupa além de 5 ramos e fatias < 3% em Outros", () => {
    const b = (id: string, premio: number) => ({ id, name: id, code: id, premio, apolices: 1, clientes: 1 });
    const { slices } = donutSlices([b("a", 30), b("b", 20), b("c", 15), b("d", 15), b("e", 10), b("f", 8), b("g", 2)]);
    expect(slices).toHaveLength(6);
    expect(slices[5]).toMatchObject({ name: "Outros", value: 10 });
  });
});
