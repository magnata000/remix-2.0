import { describe, expect, it } from "vitest";
import { assertSelfKeepsAdmin, normalizeLabels, primaryLabel } from "./permissions";

describe("vários papéis por usuário", () => {
  it("vale o papel mais amplo: Pós-venda + Comercial → Pós-venda", () => {
    expect(primaryLabel(["comercial", "pos_venda"])).toBe("pos_venda");
  });
  it("exige pelo menos um papel", () => {
    expect(() => normalizeLabels([])).toThrow();
  });
  it("admin não pode remover o próprio papel de Administrador", () => {
    expect(() => assertSelfKeepsAdmin(true, ["pos_venda"])).toThrow();
    expect(() => assertSelfKeepsAdmin(true, ["admin", "comercial"])).not.toThrow();
  });
});
