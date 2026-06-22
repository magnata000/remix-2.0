import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { commissions as seedCommissions, type Commission, type Policy } from "@/lib/mock/data";

export type CommissionStatus = Commission["status"];

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const addDaysIso = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

type Ctx = {
  commissions: Commission[];
  updateCommissionStatus: (id: string, status: CommissionStatus) => void;
  addCommissionFromPolicy: (policy: Policy) => Commission | null;
};

const CommissionContext = createContext<Ctx | null>(null);

export function CommissionStoreProvider({ children }: { children: ReactNode }) {
  const [commissions, setCommissions] = useState<Commission[]>(seedCommissions);

  const updateCommissionStatus = useCallback((id: string, status: CommissionStatus) => {
    setCommissions((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }, []);

  const addCommissionFromPolicy = useCallback((policy: Policy): Commission | null => {
    // Rules: cancelada/vencida → não gera; ativa e demais → pendente
    if (policy.status === "cancelada" || policy.status === "vencida") return null;
    const pct = policy.commissionPct ?? 0;
    const amount = Math.round(policy.premium * (pct / 100));
    const commission: Commission = {
      id: `c-${policy.id}-${newId().slice(0, 6)}`,
      policyNumber: policy.number,
      clientName: policy.clientName,
      insurer: policy.insurer,
      amount,
      dueDate: addDaysIso(policy.startDate, 30),
      status: "pendente",
    };
    setCommissions((prev) => [commission, ...prev]);
    return commission;
  }, []);

  const value = useMemo<Ctx>(
    () => ({ commissions, updateCommissionStatus, addCommissionFromPolicy }),
    [commissions, updateCommissionStatus, addCommissionFromPolicy],
  );

  return <CommissionContext.Provider value={value}>{children}</CommissionContext.Provider>;
}

export function useCommissionStore() {
  const ctx = useContext(CommissionContext);
  if (!ctx) throw new Error("useCommissionStore must be used inside CommissionStoreProvider");
  return ctx;
}
