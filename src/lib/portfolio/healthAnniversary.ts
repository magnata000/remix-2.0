/**
 * Aniversário do plano de Saúde.
 *
 * A UI trabalha com "dd/mm" (o ano é irrelevante para o usuário), mas a coluna
 * `policies.health_anniversary` é `date`. Estes helpers fazem a ponte.
 */

/** "dd/mm" + ano da vigência → "YYYY-MM-DD". Retorna undefined se inválido. */
export function annivToISO(ddmm: string, reference?: Date): string | undefined {
  const raw = (ddmm ?? "").trim();
  if (!raw) return undefined;
  // Já veio como data completa (ex.: apólice importada) — mantém.
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;

  const m = raw.match(/^(\d{1,2})\s*[/-]\s*(\d{1,2})$/);
  if (!m) return undefined;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
  const year = (reference ?? new Date()).getFullYear();
  const dt = new Date(year, month - 1, day);
  if (dt.getMonth() !== month - 1 || dt.getDate() !== day) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → "dd/mm" para exibição no formulário. */
export function isoToDdmm(iso?: string | null): string {
  const raw = (iso ?? "").trim();
  if (!raw) return "";
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return raw;
  return `${m[3]}/${m[2]}`;
}
