/**
 * Utilitários de data usados pela Daily. Puros, sem React/stores.
 */

export const DAY_MS = 1000 * 60 * 60 * 24;

export function daysBetween(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((db - da) / DAY_MS);
}

/** Converte prazo ("YYYY-MM-DD" ou ISO) em Date local; "YYYY-MM-DD" não é lido como UTC. */
export function parseDue(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
}

/** Data local no formato YYYY-MM-DD (toISOString usaria UTC e viraria o dia após 21h). */
export function localYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type DueTone = "muted" | "danger" | "warning" | "info";
export type RelativeDue = { text: string; tone: DueTone };

export function relativeDueLabel(dueISO: string | undefined, now: Date): RelativeDue {
  if (!dueISO) return { text: "Sem prazo", tone: "muted" };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueISO);
  const parsed = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dueISO);
  if (Number.isNaN(parsed.getTime())) {
    return { text: "Data inválida", tone: "muted" };
  }
  const d = daysBetween(now, parsed);
  if (d < 0) return { text: `Atrasada ${Math.abs(d)}d`, tone: "danger" };
  if (d === 0) return { text: "Hoje", tone: "warning" };
  if (d === 1) return { text: "Amanhã", tone: "warning" };
  return { text: `Em ${d}d`, tone: "info" };
}

export const toneClass: Record<DueTone, string> = {
  muted: "bg-muted text-muted-foreground",
  danger: "bg-destructive/15 text-destructive",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
};
