import type { Branch } from "@/lib/mock/data";

/**
 * Catálogo estático de ramos de seguro. Ponto único de swap para Cloud
 * (tabela `branches`) — a assinatura do hook permanece.
 */
const BRANCHES: readonly Branch[] = [
  "Auto",
  "Vida",
  "Residencial",
  "Empresarial",
  "Saúde",
  "Consórcio",
] as const;

export type UseBranchesResult = {
  branches: readonly Branch[];
};

export function useBranches(): UseBranchesResult {
  return { branches: BRANCHES };
}

/** Helper síncrono para uso fora de componentes React. */
export function getBranches(): readonly Branch[] {
  return BRANCHES;
}
