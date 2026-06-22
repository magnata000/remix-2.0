import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Insurer, Policy } from "@/lib/mock/data";
import {
  branchToProduct,
  DEFAULT_AGENCIAMENTO,
  DEFAULT_RECORRENCIA,
  DEFAULT_TAX_RATE,
  type CommissionConfig,
  type CommissionProduct,
} from "@/lib/financial/commissionEngine";

const INSURERS: Insurer[] = ["Porto Seguro", "Bradesco", "SulAmérica", "Allianz", "Mapfre"];

const baseAuto = (insurer: Insurer, comissaoLiquida = false): CommissionConfig => ({
  insurer,
  product: "auto",
  comissaoLiquida,
  taxaImposto: DEFAULT_TAX_RATE,
  agenciamento: DEFAULT_AGENCIAMENTO,
  recorrenciaPct: DEFAULT_RECORRENCIA,
  pctMin: 0.10,
  pctMax: 0.25,
  defaultScheme: "esgotamento",
});
const baseSaude = (insurer: Insurer, comissaoLiquida = false): CommissionConfig => ({
  insurer,
  product: "saude",
  comissaoLiquida,
  taxaImposto: DEFAULT_TAX_RATE,
  agenciamento: DEFAULT_AGENCIAMENTO,
  recorrenciaPct: DEFAULT_RECORRENCIA,
  pctMin: 0.02,
  pctMax: 0.05,
  defaultScheme: "agenciamento",
});
const baseConsorcio = (insurer: Insurer): CommissionConfig => ({
  insurer,
  product: "consorcio",
  comissaoLiquida: false,
  taxaImposto: DEFAULT_TAX_RATE,
  agenciamento: DEFAULT_AGENCIAMENTO,
  recorrenciaPct: DEFAULT_RECORRENCIA,
  pctMin: 0.01,
  pctMax: 0.03,
  defaultScheme: "unica",
});

// Seed: cada seguradora x cada produto
const SEED: CommissionConfig[] = [
  ...INSURERS.map((i) => baseAuto(i, i === "SulAmérica")),
  ...INSURERS.map((i) => baseSaude(i, i === "SulAmérica")),
  ...INSURERS.map((i) => baseConsorcio(i)),
];

type Ctx = {
  configs: CommissionConfig[];
  getConfig: (insurer: Insurer, product: CommissionProduct) => CommissionConfig;
  configForPolicy: (policy: Policy) => CommissionConfig;
  updateConfig: (insurer: Insurer, product: CommissionProduct, patch: Partial<CommissionConfig>) => void;
};

const Context = createContext<Ctx | null>(null);

export function CommissionConfigStoreProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useState<CommissionConfig[]>(SEED);

  const getConfig = useCallback(
    (insurer: Insurer, product: CommissionProduct) => {
      const found = configs.find((c) => c.insurer === insurer && c.product === product);
      if (found) return found;
      // fallback razoável
      return product === "saude" ? baseSaude(insurer) : product === "consorcio" ? baseConsorcio(insurer) : baseAuto(insurer);
    },
    [configs],
  );

  const configForPolicy = useCallback(
    (policy: Policy): CommissionConfig => {
      const base = getConfig(policy.insurer, branchToProduct(policy.branch));
      // Aplica overrides da apólice (não persiste, só efeito imediato)
      return {
        ...base,
        comissaoLiquida: policy.comissaoLiquida ?? base.comissaoLiquida,
        taxaImposto: policy.taxaImposto ?? base.taxaImposto,
        agenciamento: policy.agenciamentoSchedule ?? base.agenciamento,
        recorrenciaPct: policy.recorrenciaPct ?? base.recorrenciaPct,
        defaultScheme: policy.commissionScheme ?? base.defaultScheme,
      };
    },
    [getConfig],
  );

  const updateConfig = useCallback(
    (insurer: Insurer, product: CommissionProduct, patch: Partial<CommissionConfig>) => {
      setConfigs((prev) =>
        prev.map((c) => (c.insurer === insurer && c.product === product ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  const value = useMemo<Ctx>(
    () => ({ configs, getConfig, configForPolicy, updateConfig }),
    [configs, getConfig, configForPolicy, updateConfig],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCommissionConfigStore() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useCommissionConfigStore must be used inside CommissionConfigStoreProvider");
  return ctx;
}
