import type { Branch, Insurer } from "@/lib/mock/data";
import { insurerLogos as seedLogos } from "@/lib/mock/data";


/**
 * Catálogo estático de seguradoras. Ponto único de swap quando a fonte
 * migrar para Cloud (tabela `insurers`) — a assinatura do hook permanece.
 */
const INSURERS: readonly Insurer[] = [
  "Porto Seguro",
  "Bradesco",
  "SulAmérica",
  "Allianz",
  "Mapfre",
  "Suhai",
  "Amil",
  "Tokio Marine",
  "Azul",
  "Prevent Sênior",
  "MedSênior",
  "São Cristóvão",
  "Transmontano",
  "São Miguel",
  "Itaú Seguros",
  "NotreDame",
  "Aliro",
] as const;

const LOGOS: Readonly<Record<Insurer, string>> = seedLogos;

export type UseInsurersResult = {
  insurers: readonly Insurer[];
  logos: Readonly<Record<Insurer, string>>;
  getLogo: (insurer: Insurer) => string;
};

export function useInsurers(): UseInsurersResult {
  return {
    insurers: INSURERS,
    logos: LOGOS,
    getLogo: (insurer) => LOGOS[insurer] ?? "",
  };
}

/** Helper síncrono para uso fora de componentes React. */
export function getInsurers(): readonly Insurer[] {
  return INSURERS;
}

/** Seguradoras disponíveis por ramo. Saúde possui catálogo próprio. */
const HEALTH_INSURERS: readonly Insurer[] = [
  "Amil",
  "Bradesco",
  "MedSênior",
  "Porto Seguro",
  "Prevent Sênior",
  "São Cristóvão",
  "SulAmérica",
];

const GENERAL_INSURERS: readonly Insurer[] = [
  "Azul",
  "Bradesco",
  "Itaú Seguros",
  "Porto Seguro",
  "Suhai",
  "SulAmérica",
  "Tokio Marine",
];

export function getInsurersForBranch(branch: Branch): readonly Insurer[] {
  return branch === "Saúde" ? HEALTH_INSURERS : GENERAL_INSURERS;
}

