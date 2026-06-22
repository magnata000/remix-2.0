import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { commissions as seedCommissions, type Commission, type Policy } from "@/lib/mock/data";
import {
  generateCommissionSchedule,
  expectedRecurrencesUntil,
  branchToProduct,
} from "@/lib/financial/commissionEngine";
import { useCommissionConfigStore } from "@/lib/financial/commissionConfigStore";
import { usePolicyStore } from "@/lib/portfolio/policyStore";

export type CommissionStatus = Commission["status"];

type Ctx = {
  commissions: Commission[];
  updateCommissionStatus: (id: string, status: CommissionStatus) => void;
  generateForPolicy: (policy: Policy) => Commission[];
  /** retorna todas as comissões de uma apólice (cronograma) */
  scheduleOfPolicy: (policyId: string) => Commission[];
};

const CommissionContext = createContext<Ctx | null>(null);

export function CommissionStoreProvider({ children }: { children: ReactNode }) {
  const [commissions, setCommissions] = useState<Commission[]>(seedCommissions);
  const { configForPolicy } = useCommissionConfigStore();
  const { policies } = usePolicyStore();

  const updateCommissionStatus = useCallback((id: string, status: CommissionStatus) => {
    setCommissions((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }, []);

  const generateForPolicy = useCallback(
    (policy: Policy): Commission[] => {
      const config = configForPolicy(policy);
      const created = generateCommissionSchedule(policy, config);
      if (created.length === 0) return [];
      setCommissions((prev) => [...created, ...prev]);
      return created;
    },
    [configForPolicy],
  );

  // Efeito: garantir recorrências mensais para apólices Saúde até o mês corrente
  useEffect(() => {
    const reference = new Date();
    setCommissions((prev) => {
      const additions: Commission[] = [];
      for (const policy of policies) {
        if (branchToProduct(policy.branch) !== "saude") continue;
        const existing = prev.filter((c) => c.policyId === policy.id && c.kind === "recorrencia");
        const existingDates = new Set(existing.map((c) => c.dueDate));
        const config = configForPolicy(policy);
        const novos = expectedRecurrencesUntil(policy, config, reference, existingDates);
        additions.push(...novos);
      }
      return additions.length ? [...additions, ...prev] : prev;
    });
  }, [policies, configForPolicy]);

  const scheduleOfPolicy = useCallback(
    (policyId: string) =>
      commissions
        .filter((c) => c.policyId === policyId)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [commissions],
  );

  const value = useMemo<Ctx>(
    () => ({ commissions, updateCommissionStatus, generateForPolicy, scheduleOfPolicy }),
    [commissions, updateCommissionStatus, generateForPolicy, scheduleOfPolicy],
  );

  return <CommissionContext.Provider value={value}>{children}</CommissionContext.Provider>;
}

export function useCommissionStore() {
  const ctx = useContext(CommissionContext);
  if (!ctx) throw new Error("useCommissionStore must be used inside CommissionStoreProvider");
  return ctx;
}
