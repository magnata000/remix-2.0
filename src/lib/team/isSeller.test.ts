import { describe, expect, it } from "vitest";
import { isSeller } from "./teamStore";

describe("Repasses: quem aparece como vendedor", () => {
  it("admin com papel comercial duplo aparece", () => {
    expect(isSeller({ role: "admin", roles: ["admin", "vendedor"] })).toBe(true);
  });
  it("admin sem papel comercial não aparece", () => {
    expect(isSeller({ role: "admin", roles: ["admin"] })).toBe(false);
  });
});
