import { describe, it, expect } from "vitest";
import { inRange } from "./reportMetrics";

describe("inRange com datas YYYY-MM-DD", () => {
  it("vencimento 01/10 conta em outubro, não em setembro", () => {
    const out = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 31, 23, 59, 59) };
    const set = { start: new Date(2026, 8, 1), end: new Date(2026, 8, 30, 23, 59, 59) };
    expect(inRange("2026-10-01", out)).toBe(true);
    expect(inRange("2026-10-01", set)).toBe(false);
  });
});
