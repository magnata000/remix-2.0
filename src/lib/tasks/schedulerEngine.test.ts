import { describe, expect, it } from "vitest";
import { computeDueScheduledTasks } from "./schedulerEngine";
import type { ScheduledTask } from "./types";

// Terça-feira, 25/08/2026 (datas locais)
const NOW = new Date(2026, 7, 25, 12, 0, 0);
const COL = "col-1";

const base: Omit<ScheduledTask, "kind"> = {
  id: "s1",
  title: "Tarefa X",
  assigneeId: "u1",
  priority: "media",
};

const run = (scheduled: ScheduledTask[]) =>
  computeDueScheduledTasks({ scheduled, defaultColumnId: COL, now: NOW });

describe("computeDueScheduledTasks — data avulsa", () => {
  it("materializa no dia", () => {
    const out = run([{ ...base, kind: "data", startDate: "2026-08-25" }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      title: "Tarefa X",
      dueDate: "2026-08-25",
      columnId: COL,
      sourceKey: "sched:s1:2026-08-25",
    });
  });

  it("recupera data perdida dentro de 14 dias", () => {
    const out = run([{ ...base, kind: "data", startDate: "2026-08-21" }]);
    expect(out.map((t) => t.dueDate)).toEqual(["2026-08-21"]);
  });

  it("ignora data perdida fora da janela de 14 dias", () => {
    expect(run([{ ...base, kind: "data", startDate: "2026-08-05" }])).toHaveLength(0);
  });

  it("ignora data futura", () => {
    expect(run([{ ...base, kind: "data", startDate: "2026-09-03" }])).toHaveLength(0);
  });
});

describe("computeDueScheduledTasks — data com período", () => {
  it("mensal: materializa ocorrência de hoje; anterior fora da janela não volta", () => {
    // ocorrências em 25/07 e 25/08 — a de julho está a 31 dias, fora da janela de 14
    const out = run([{ ...base, kind: "data", startDate: "2026-07-25", period: "mensal" }]);
    expect(out.map((t) => t.dueDate)).toEqual(["2026-08-25"]);
  });

  it("mensal sem ocorrência hoje: só a última perdida na janela", () => {
    const out = run([{ ...base, kind: "data", startDate: "2026-07-20", period: "mensal" }]);
    expect(out.map((t) => t.dueDate)).toEqual(["2026-08-20"]);
  });

  it("respeita endDate como limite da repetição", () => {
    // anual com fim em 2025: nenhuma ocorrência alcança 2026
    const out = run([
      { ...base, kind: "data", startDate: "2024-08-25", endDate: "2025-08-25", period: "anual" },
    ]);
    expect(out).toHaveLength(0);
  });

  it("não cria ocorrências anteriores à criação do agendamento", () => {
    const out = run([
      {
        ...base,
        kind: "data",
        startDate: "2026-01-25",
        period: "mensal",
        createdAt: "2026-08-20T14:00:00.000Z",
      },
    ]);
    expect(out.map((t) => t.dueDate)).toEqual(["2026-08-25"]);
  });
});

describe("computeDueScheduledTasks — dias da semana", () => {
  it("materializa hoje + último dia útil perdido", () => {
    // seg–sex, criado em 18/08/2026 → última perdida = seg 24/08
    const out = run([
      { ...base, kind: "semana", weekdays: [1, 2, 3, 4, 5], createdAt: "2026-08-18T14:00:00.000Z" },
    ]);
    expect(out.map((t) => t.dueDate)).toEqual(["2026-08-24", "2026-08-25"]);
  });

  it("não cria ocorrências anteriores à criação", () => {
    // terças, criado hoje → só hoje
    const out = run([
      { ...base, kind: "semana", weekdays: [2], createdAt: "2026-08-25T09:00:00.000Z" },
    ]);
    expect(out.map((t) => t.dueDate)).toEqual(["2026-08-25"]);
  });

  it("sem dias selecionados não gera nada", () => {
    expect(run([{ ...base, kind: "semana", weekdays: [] }])).toHaveLength(0);
  });
});

describe("computeDueScheduledTasks — recorrência avançada", () => {
  it("semanal por dia da semana", () => {
    const out = run([
      {
        ...base,
        kind: "recorrente",
        createdAt: "2026-08-18T14:00:00.000Z",
        recurrence: { freq: "weekly", interval: 1, byWeekday: [2] },
      },
    ]);
    expect(out.map((t) => t.dueDate)).toEqual(["2026-08-18", "2026-08-25"]);
  });

  it("mensal por dia do mês", () => {
    const out = run([
      {
        ...base,
        kind: "recorrente",
        createdAt: "2026-07-01T14:00:00.000Z",
        recurrence: { freq: "monthly", interval: 1, byMonthDay: 20 },
      },
    ]);
    // 20/07 está fora da janela; 20/08 é a última perdida
    expect(out.map((t) => t.dueDate)).toEqual(["2026-08-20"]);
  });

  it("respeita until da regra", () => {
    const out = run([
      {
        ...base,
        kind: "recorrente",
        createdAt: "2026-08-01T14:00:00.000Z",
        recurrence: { freq: "daily", interval: 1, until: "2026-08-10" },
      },
    ]);
    // última ocorrência (10/08) está fora da janela de recuperação
    expect(out).toHaveLength(0);
  });
});

describe("computeDueScheduledTasks — formato do cartão", () => {
  it("preserva prioridade, responsável e descrição; chaves únicas por data", () => {
    const out = run([
      {
        ...base,
        id: "abc",
        kind: "semana",
        weekdays: [2], // terças
        createdAt: "2026-08-18T14:00:00.000Z",
        priority: "alta",
        assigneeId: "u9",
        description: "Detalhe",
      },
    ]);
    expect(out.map((t) => t.dueDate)).toEqual(["2026-08-18", "2026-08-25"]);
    expect(out[0]).toMatchObject({ priority: "alta", assigneeId: "u9", description: "Detalhe" });
    expect(new Set(out.map((t) => t.sourceKey)).size).toBe(2);
    expect(out[0].sourceKey).toBe("sched:abc:2026-08-18");
  });
});
