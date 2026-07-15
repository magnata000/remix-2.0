import { describe, it, expect } from "vitest";
import { daysBetween, relativeDueLabel } from "./dateUtils";

const NOW = new Date(2026, 6, 15, 10, 0, 0); // 2026-07-15 10:00 local

describe("daysBetween", () => {
  it("ignores time-of-day", () => {
    const a = new Date(2026, 6, 15, 0, 1);
    const b = new Date(2026, 6, 15, 23, 59);
    expect(daysBetween(a, b)).toBe(0);
  });
  it("returns positive delta for future", () => {
    expect(daysBetween(NOW, new Date(2026, 6, 20))).toBe(5);
  });
  it("returns negative delta for past", () => {
    expect(daysBetween(NOW, new Date(2026, 6, 10))).toBe(-5);
  });
});

describe("relativeDueLabel", () => {
  it("returns muted 'Sem prazo' for undefined", () => {
    expect(relativeDueLabel(undefined, NOW)).toEqual({
      text: "Sem prazo",
      tone: "muted",
    });
  });

  it("returns muted 'Data inválida' for garbage ISO", () => {
    expect(relativeDueLabel("not-a-date", NOW)).toEqual({
      text: "Data inválida",
      tone: "muted",
    });
  });

  it("marks past dates as danger with days count", () => {
    const iso = new Date(2026, 6, 12).toISOString();
    expect(relativeDueLabel(iso, NOW)).toEqual({
      text: "Atrasada 3d",
      tone: "danger",
    });
  });

  it("marks today as warning", () => {
    const iso = new Date(2026, 6, 15, 23, 0).toISOString();
    expect(relativeDueLabel(iso, NOW)).toEqual({
      text: "Hoje",
      tone: "warning",
    });
  });

  it("marks tomorrow as warning", () => {
    const iso = new Date(2026, 6, 16, 8, 0).toISOString();
    expect(relativeDueLabel(iso, NOW)).toEqual({
      text: "Amanhã",
      tone: "warning",
    });
  });

  it("marks future dates as info with days count", () => {
    const iso = new Date(2026, 6, 20).toISOString();
    expect(relativeDueLabel(iso, NOW)).toEqual({
      text: "Em 5d",
      tone: "info",
    });
  });

  it("computes days ignoring time-of-day at the boundary", () => {
    const iso = new Date(2026, 6, 16, 0, 5).toISOString();
    // NOW is 15/07 10:00; alvo é 16/07 00:05 → 1 dia calendário
    expect(relativeDueLabel(iso, NOW).text).toBe("Amanhã");
  });
});
