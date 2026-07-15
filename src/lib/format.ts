/**
 * Utilitários puros de formatação — sem dependência de mocks.
 * Ponto único onde `formatDateShort` vive; `mock/data.ts` re-exporta por
 * compatibilidade temporária (@deprecated).
 */

export function formatDateShort(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
