import { describe, it, expect } from "vitest";
import { ageAt, isBirthdayToday, findBandChange } from "@/lib/daily/ageBands";
describe("ageBands", () => {
  const now = new Date(2026, 7, 17, 8, 0, 0);
  it("detecta aniversário no dia (data pura)", () => {
    expect(isBirthdayToday("1994-08-17", now)).toBe(true);
    expect(ageAt("1994-08-17", now)).toBe(32);
  });
  it("não confunde véspera/dia seguinte", () => {
    expect(isBirthdayToday("1994-08-16", now)).toBe(false);
    expect(isBirthdayToday("1994-08-18", now)).toBe(false);
  });
  it("bissexto", () => {
    expect(isBirthdayToday("1996-02-29", new Date(2024, 1, 29))).toBe(true);
  });
  it("faixa ANS", () => {
    const r = findBandChange("2007-09-01", 90, now);
    expect(r?.nextBand).toBe("19-23");
  });
});
