/**
 * Motor de recorrência estilo Google Calendar (subset).
 * Suporta:
 *  - freq: 'daily' | 'weekly' | 'monthly'
 *  - interval: a cada X (unidade)
 *  - byWeekday: dias da semana [0..6] (semanal)
 *  - byMonthDay: dia do mês 1..31 (mensal)
 *  - parity: 'even' | 'odd' (diário — filtra dia do mês)
 *  - until / count: limites opcionais
 */
export type Recurrence = {
  freq: "daily" | "weekly" | "monthly";
  interval: number;
  byWeekday?: number[];
  byMonthDay?: number;
  parity?: "even" | "odd";
  until?: string; // ISO date
  count?: number;
};

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const addMonths = (d: Date, n: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};

/**
 * Expande ocorrências da recorrência entre [from, to].
 * `anchor` é a data-âncora (start) da série.
 */
function expandOccurrences(rule: Recurrence, anchor: Date, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const start = dayStart(anchor);
  const until = rule.until ? dayStart(new Date(rule.until)) : null;
  const limit = rule.count ?? 1000;
  const maxIter = 5000;

  const push = (d: Date) => {
    if (until && d > until) return false;
    if (d < dayStart(from)) return true;
    if (d > dayStart(to)) return false;
    out.push(d);
    return out.length < limit;
  };

  if (rule.freq === "daily") {
    let cur = start;
    for (let i = 0; i < maxIter; i++) {
      if (cur > dayStart(to)) break;
      const day = cur.getDate();
      const ok =
        !rule.parity ||
        (rule.parity === "even" && day % 2 === 0) ||
        (rule.parity === "odd" && day % 2 === 1);
      if (ok && !push(cur)) break;
      cur = addDays(cur, Math.max(1, rule.interval));
    }
  } else if (rule.freq === "weekly") {
    const weekdays = rule.byWeekday?.length ? rule.byWeekday : [start.getDay()];
    // Alinha para o início da semana da âncora (domingo)
    let weekStart = addDays(start, -start.getDay());
    for (let w = 0; w < maxIter; w++) {
      if (weekStart > addDays(dayStart(to), 6)) break;
      for (const wd of weekdays) {
        const d = addDays(weekStart, wd);
        if (d < start) continue;
        if (!push(d)) return out;
      }
      weekStart = addDays(weekStart, 7 * Math.max(1, rule.interval));
    }
  } else if (rule.freq === "monthly") {
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const day = rule.byMonthDay ?? start.getDate();
    for (let i = 0; i < maxIter; i++) {
      // último dia do mês, para lidar com dia=31 em meses menores
      const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const d = new Date(cur.getFullYear(), cur.getMonth(), Math.min(day, lastDay));
      if (d >= start) {
        if (d > dayStart(to)) break;
        if (!push(d)) break;
      }
      cur = addMonths(cur, Math.max(1, rule.interval));
    }
  }

  return out;
}

/** Descrição amigável em pt-BR. */
export function describeRecurrence(rule: Recurrence): string {
  const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const every = rule.interval > 1;
  if (rule.freq === "daily") {
    let base = every ? `A cada ${rule.interval} dias` : "Todos os dias";
    if (rule.parity === "even") base += " · pares";
    else if (rule.parity === "odd") base += " · ímpares";
    return base;
  }
  if (rule.freq === "weekly") {
    const base = every ? `A cada ${rule.interval} semanas` : "Toda semana";
    const days = rule.byWeekday?.length
      ? " · " +
        rule.byWeekday
          .slice()
          .sort()
          .map((d) => WD[d])
          .join(", ")
      : "";
    return base + days;
  }
  const base = every ? `A cada ${rule.interval} meses` : "Todo mês";
  return base + (rule.byMonthDay ? ` · dia ${rule.byMonthDay}` : "");
}
