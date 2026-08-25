/**
 * Motor de materialização de tarefas agendadas.
 *
 * Dado o conjunto de ScheduledTask, calcula quais cartões deveriam existir no
 * quadro até hoje (inclusive) e devolve NewTaskInput com `sourceKey`
 * `sched:<scheduledId>:<yyyy-mm-dd>` — o backend faz upsert com
 * ignoreDuplicates nessa chave, então rodar várias vezes nunca duplica.
 *
 * Regras:
 *  - "data" sem repetição: um cartão no dia; recupera até 14 dias para trás.
 *  - "data" com período / "semana" / "recorrente": cartão da ocorrência de
 *    hoje (se houver) + apenas a última ocorrência perdida (máx. 14 dias),
 *    para não gerar enxurrada de cartões atrasados.
 *  - Nenhuma ocorrência é criada antes da data de criação do agendamento.
 */
import { expandOccurrences } from "./recurrence";
import type { NewTaskInput, PeriodKind, ScheduledTask } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Janela de recuperação (dias para trás) para ocorrências perdidas. */
const RECOVERY_LOOKBACK_DAYS = 14;
/** Janela de varredura para encontrar a última ocorrência de regras frequentes. */
const RECURRING_SCAN_DAYS = 45;
const MAX_SCAN = 600;

const PERIOD_MONTHS: Record<PeriodKind, number> = {
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
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
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);

/** Aceita "yyyy-mm-dd" ou ISO completo; devolve o dia local à meia-noite. */
function parseDateOnly(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  return isNaN(d.getTime()) ? null : dayStart(d);
}

function oneOffOccurrence(s: ScheduledTask, today: Date): Date[] {
  const start = parseDateOnly(s.startDate);
  if (!start || start.getTime() > today.getTime()) return [];
  if (daysBetween(start, today) > RECOVERY_LOOKBACK_DAYS) return [];
  return [start];
}

function periodOccurrences(s: ScheduledTask, today: Date): Date[] {
  const start = parseDateOnly(s.startDate);
  if (!start || start.getTime() > today.getTime() || !s.period) return [];
  const months = PERIOD_MONTHS[s.period];
  const end = parseDateOnly(s.endDate);
  const limit = end && end.getTime() > start.getTime() ? end : null;
  const created = parseDateOnly(s.createdAt);
  const out: Date[] = [];
  let cur = start;
  for (let i = 0; i < MAX_SCAN && cur.getTime() <= today.getTime(); i += 1) {
    if (limit && cur.getTime() > limit.getTime()) break;
    if (!created || cur.getTime() >= created.getTime()) out.push(cur);
    cur = addMonths(cur, months);
  }
  return out;
}

function weekdayOccurrences(s: ScheduledTask, today: Date): Date[] {
  if (!s.weekdays?.length) return [];
  const created = parseDateOnly(s.createdAt);
  const out: Date[] = [];
  for (
    let d = addDays(today, -RECURRING_SCAN_DAYS);
    d.getTime() <= today.getTime();
    d = addDays(d, 1)
  ) {
    if (!s.weekdays.includes(d.getDay())) continue;
    if (created && d.getTime() < created.getTime()) continue;
    out.push(d);
  }
  return out;
}

function recurrenceOccurrences(s: ScheduledTask, today: Date): Date[] {
  if (!s.recurrence) return [];
  const created = parseDateOnly(s.createdAt);
  const anchor = created ?? today;
  return expandOccurrences(
    s.recurrence,
    anchor,
    addDays(today, -RECURRING_SCAN_DAYS),
    today,
  ).filter((d) => !created || d.getTime() >= created.getTime());
}

/** Ocorrência de hoje (se houver) + última ocorrência perdida na janela de recuperação. */
function pickDue(occurrences: Date[], today: Date): Date[] {
  const past = occurrences.filter(
    (d) => d.getTime() < today.getTime() && daysBetween(d, today) <= RECOVERY_LOOKBACK_DAYS,
  );
  const dueToday = occurrences.filter((d) => d.getTime() === today.getTime());
  const lastPast = past.length ? [past[past.length - 1]] : [];
  return [...lastPast, ...dueToday];
}

export function computeDueScheduledTasks({
  scheduled,
  defaultColumnId,
  now = new Date(),
}: {
  scheduled: ScheduledTask[];
  defaultColumnId: string;
  now?: Date;
}): NewTaskInput[] {
  const today = dayStart(now);
  const out: NewTaskInput[] = [];

  for (const s of scheduled) {
    let dates: Date[] = [];
    if (s.kind === "data" && !s.period) dates = oneOffOccurrence(s, today);
    else if (s.kind === "data" && s.period) dates = pickDue(periodOccurrences(s, today), today);
    else if (s.kind === "semana") dates = pickDue(weekdayOccurrences(s, today), today);
    else if (s.kind === "recorrente") dates = pickDue(recurrenceOccurrences(s, today), today);

    for (const d of dates) {
      out.push({
        title: s.title,
        description: s.description ?? "",
        dueDate: isoDay(d),
        priority: s.priority,
        assigneeId: s.assigneeId,
        columnId: defaultColumnId,
        sourceKey: `sched:${s.id}:${isoDay(d)}`,
      });
    }
  }
  return out;
}
