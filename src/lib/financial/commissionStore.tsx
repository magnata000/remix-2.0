import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { commissions as seedCommissions, type Commission, type CommissionStatusValue, type Policy } from "@/lib/mock/data";
import {
  generateCommissionSchedule,
  expectedRecurrencesUntil,
  branchToProduct,
} from "@/lib/financial/commissionEngine";
import { useCommissionConfigStore } from "@/lib/financial/commissionConfigStore";
import { usePolicyStore } from "@/lib/portfolio/policyStore";
import { toast } from "sonner";

export type CommissionStatus = CommissionStatusValue;

type Ctx = {
  commissions: Commission[];
  updateCommissionStatus: (id: string, status: CommissionStatus) => void;
  patchCommission: (id: string, patch: Partial<Commission>) => void;
  generateForPolicy: (policy: Policy) => Commission[];
  scheduleOfPolicy: (policyId: string) => Commission[];
  deleteByPolicy: (policyId: string) => void;
};

const CommissionContext = createContext<Ctx | null>(null);

export function CommissionStoreProvider({ children }: { children: ReactNode }) {
  const [commissions, setCommissions] = useState<Commission[]>(seedCommissions);
  const { configForPolicy } = useCommissionConfigStore();
  const { policies } = usePolicyStore();

  const updateCommissionStatus = useCallback((id: string, status: CommissionStatus) => {
    setCommissions((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next: Commission = { ...c, status };
        if (status === "pago" && !c.paidAt) next.paidAt = new Date().toISOString();
        if (status === "devolvido" && !c.refundedAt) next.refundedAt = new Date().toISOString();
        return next;
      }),
    );
  }, []);

  const patchCommission = useCallback((id: string, patch: Partial<Commission>) => {
    setCommissions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
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
        if (policy.status === "cancelada" || policy.status === "vencida") continue;
        const existing = prev.filter((c) => c.policyId === policy.id && c.kind === "recorrencia");
        const existingDates = new Set(existing.map((c) => c.dueDate));
        const config = configForPolicy(policy);
        const novos = expectedRecurrencesUntil(policy, config, reference, existingDates);
        additions.push(...novos);
      }
      return additions.length ? [...additions, ...prev] : prev;
    });
  }, [policies, configForPolicy]);

  // Cascata de cancelamento: pagas → devolvido, pendentes/atrasadas → cancelada
  const prevStatusRef = useRef<Map<string, Policy["status"]>>(new Map());
  useEffect(() => {
    const prevMap = prevStatusRef.current;
    const transitions: { policy: Policy }[] = [];
    for (const p of policies) {
      const before = prevMap.get(p.id);
      if (before && before !== "cancelada" && p.status === "cancelada") {
        transitions.push({ policy: p });
      }
    }
    // atualizar snapshot
    const nextMap = new Map<string, Policy["status"]>();
    policies.forEach((p) => nextMap.set(p.id, p.status));
    prevStatusRef.current = nextMap;

    if (transitions.length === 0) return;

    setCommissions((prev) => {
      let devolvidas = 0;
      let canceladas = 0;
      const refundedAt = new Date().toISOString();
      const next = prev.map((c) => {
        const t = transitions.find((tr) => tr.policy.id === c.policyId);
        if (!t) return c;
        if (c.status === "pago") {
          devolvidas += 1;
          return { ...c, status: "devolvido" as const, refundedAt, refundReason: `Cancelamento da apólice ${t.policy.number}` };
        }
        if (c.status === "pendente" || c.status === "atrasado") {
          canceladas += 1;
          return { ...c, status: "cancelada" as const };
        }
        return c;
      });
      if (devolvidas + canceladas > 0) {
        const parts: string[] = [];
        if (devolvidas) parts.push(`${devolvidas} devolvida(s)`);
        if (canceladas) parts.push(`${canceladas} cancelada(s)`);
        setTimeout(() => toast.info(`Comissões atualizadas: ${parts.join(" · ")}`), 0);
      }
      return next;
    });
  }, [policies]);

  const scheduleOfPolicy = useCallback(
    (policyId: string) =>
      commissions
        .filter((c) => c.policyId === policyId)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [commissions],
  );

  const deleteByPolicy = useCallback((policyId: string) => {
    setCommissions((prev) => prev.filter((c) => c.policyId !== policyId));
  }, []);

  const value = useMemo<Ctx>(
    () => ({ commissions, updateCommissionStatus, patchCommission, generateForPolicy, scheduleOfPolicy, deleteByPolicy }),
    [commissions, updateCommissionStatus, patchCommission, generateForPolicy, scheduleOfPolicy, deleteByPolicy],
  );

  return <CommissionContext.Provider value={value}>{children}</CommissionContext.Provider>;
}

export function useCommissionStore() {
  const ctx = useContext(CommissionContext);
  if (!ctx) throw new Error("useCommissionStore must be used inside CommissionStoreProvider");
  return ctx;
}
