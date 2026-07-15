// Faixas etárias ANS (Resolução Normativa nº 63/2003) para planos de Saúde.
// Cada faixa cobre idades no intervalo [min, max] inclusive.
const ANS_AGE_BANDS: Array<{ min: number; max: number; label: string }> = [
  { min: 0, max: 18, label: "0-18" },
  { min: 19, max: 23, label: "19-23" },
  { min: 24, max: 28, label: "24-28" },
  { min: 29, max: 33, label: "29-33" },
  { min: 34, max: 38, label: "34-38" },
  { min: 39, max: 43, label: "39-43" },
  { min: 44, max: 48, label: "44-48" },
  { min: 49, max: 53, label: "49-53" },
  { min: 54, max: 58, label: "54-58" },
  { min: 59, max: 200, label: "59+" },
];

export function ageAt(birthDateISO: string, ref: Date): number {
  const b = new Date(birthDateISO);
  if (Number.isNaN(b.getTime())) return -1;
  let age = ref.getFullYear() - b.getFullYear();
  const m = ref.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) age -= 1;
  return age;
}

function bandOf(age: number) {
  return ANS_AGE_BANDS.find((b) => age >= b.min && age <= b.max) ?? null;
}

/**
 * Se a pessoa muda de faixa etária dentro de `withinDays` dias a partir de hoje,
 * retorna { currentBand, nextBand, changeDate } — senão null.
 */
export function findBandChange(
  birthDateISO: string,
  withinDays: number,
  now: Date = new Date(),
): { currentBand: string; nextBand: string; changeDate: Date } | null {
  const b = new Date(birthDateISO);
  if (Number.isNaN(b.getTime())) return null;
  const currentAge = ageAt(birthDateISO, now);
  const currentBand = bandOf(currentAge);
  if (!currentBand) return null;

  // Próximo aniversário
  const nextBirthday = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1);

  const daysUntil = Math.ceil((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil > withinDays) return null;

  const newAge = currentAge + 1;
  const nextBand = bandOf(newAge);
  if (!nextBand || nextBand.label === currentBand.label) return null;

  return { currentBand: currentBand.label, nextBand: nextBand.label, changeDate: nextBirthday };
}

export function isBirthdayToday(birthDateISO: string, now: Date = new Date()): boolean {
  const b = new Date(birthDateISO);
  if (Number.isNaN(b.getTime())) return false;
  return b.getMonth() === now.getMonth() && b.getDate() === now.getDate();
}
