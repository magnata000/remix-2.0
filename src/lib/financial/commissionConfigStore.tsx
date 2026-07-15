import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Insurer, Policy } from "@/lib/mock/data";
import {
  branchToProduct,
  DEFAULT_AGENCIAMENTO,
  DEFAULT_RECORRENCIA,
  DEFAULT_TAX_RATE,
  type CommissionConfig,
  type CommissionProduct,
  type Malha,
} from "@/lib/financial/commissionEngine";

const INSURERS: Insurer[] = ["Porto Seguro", "Bradesco", "SulAmérica", "Allianz", "Mapfre"];

const baseAuto = (insurer: Insurer, comissaoLiquida = false): CommissionConfig => ({
  insurer,
  product: "auto",
  comissaoLiquida,
  taxaImposto: DEFAULT_TAX_RATE,
  agenciamento: DEFAULT_AGENCIAMENTO,
  recorrenciaPct: DEFAULT_RECORRENCIA,
  pctMin: 0.1,
  pctMax: 0.25,
  defaultScheme: "esgotamento",
  parceladoMinInstallments: 5,
  adiantamentoMaxInstallments: 4,
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
  vitalicioStartInstallment: 13,
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

const SEED_MALHAS: Malha[] = INSURERS.map((insurer, idx) => ({
  id: `malha-${idx + 1}`,
  insurer,
  name: "Padrão",
}));

type Ctx = {
  configs: CommissionConfig[];
  malhas: Malha[];
  getConfig: (insurer: Insurer, product: CommissionProduct) => CommissionConfig;
  configForPolicy: (policy: Policy) => CommissionConfig;
  updateConfig: (
    insurer: Insurer,
    product: CommissionProduct,
    patch: Partial<CommissionConfig>,
  ) => void;
  listMalhas: (insurer: Insurer) => Malha[];
  addMalha: (insurer: Insurer, name: string) => Malha;
  updateMalha: (id: string, patch: Partial<Omit<Malha, "id" | "insurer">>) => void;
  removeMalha: (id: string) => void;
  findMalha: (id?: string) => Malha | undefined;
};

const Context = createContext<Ctx | null>(null);

export function CommissionConfigStoreProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useState<CommissionConfig[]>(SEED);
  const [malhas, setMalhas] = useState<Malha[]>(SEED_MALHAS);

  const getConfig = useCallback(
    (insurer: Insurer, product: CommissionProduct) => {
      const found = configs.find((c) => c.insurer === insurer && c.product === product);
      if (found) return found;
      return product === "saude"
        ? baseSaude(insurer)
        : product === "consorcio"
          ? baseConsorcio(insurer)
          : baseAuto(insurer);
    },
    [configs],
  );

  const configForPolicy = useCallback(
    (policy: Policy): CommissionConfig => {
      const base = getConfig(policy.insurer, branchToProduct(policy.branch));
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

  const listMalhas = useCallback(
    (insurer: Insurer) => malhas.filter((m) => m.insurer === insurer),
    [malhas],
  );

  const addMalha = useCallback((insurer: Insurer, name: string): Malha => {
    const malha: Malha = {
      id: `malha-${Date.now().toString(36)}`,
      insurer,
      name: name.trim() || "Sem nome",
    };
    setMalhas((prev) => [...prev, malha]);
    return malha;
  }, []);

  const updateMalha = useCallback((id: string, patch: Partial<Omit<Malha, "id" | "insurer">>) => {
    setMalhas((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const removeMalha = useCallback((id: string) => {
    setMalhas((prev) => prev.filter((m) => m.id !== id));
    setConfigs((prev) => prev.map((c) => (c.malhaId === id ? { ...c, malhaId: undefined } : c)));
  }, []);

  const findMalha = useCallback((id?: string) => malhas.find((m) => m.id === id), [malhas]);

  const value = useMemo<Ctx>(
    () => ({
      configs,
      malhas,
      getConfig,
      configForPolicy,
      updateConfig,
      listMalhas,
      addMalha,
      updateMalha,
      removeMalha,
      findMalha,
    }),
    [
      configs,
      malhas,
      getConfig,
      configForPolicy,
      updateConfig,
      listMalhas,
      addMalha,
      updateMalha,
      removeMalha,
      findMalha,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCommissionConfigStore() {
  const ctx = useContext(Context);
  if (!ctx)
    throw new Error("useCommissionConfigStore must be used inside CommissionConfigStoreProvider");
  return ctx;
}
