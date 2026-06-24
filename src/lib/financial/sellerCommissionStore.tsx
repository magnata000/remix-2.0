import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Branch, Commission, Policy } from "@/lib/mock/data";
import { useTeam } from "@/lib/team/teamStore";

export type SellerCommissionRate = {
  memberId: string;
  branch: Branch;
  pct: number; // 0..100
};

const BRANCHES: Branch[] = ["Auto", "Vida", "Residencial", "Empresarial", "Saúde", "Consórcio"];
const DEFAULT_PCT = 30;

type Ctx = {
  rates: SellerCommissionRate[];
  getRate: (memberId: string, branch: Branch) => number;
  updateRate: (memberId: string, branch: Branch, pct: number) => void;
  computePayout: (commission: Commission, policy: Policy | undefined) => number;
};

const SellerCtx = createContext<Ctx | null>(null);

export function SellerCommissionStoreProvider({ children }: { children: ReactNode }) {
  const { members } = useTeam();
  const sellers = useMemo(() => members.filter((m) => m.role === "Vendedor"), [members]);

  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const keyOf = (memberId: string, branch: Branch) => `${memberId}::${branch}`;

  const rates = useMemo<SellerCommissionRate[]>(() => {
    const out: SellerCommissionRate[] = [];
    sellers.forEach((s) => {
      BRANCHES.forEach((b) => {
        const k = keyOf(s.id, b);
        out.push({ memberId: s.id, branch: b, pct: overrides[k] ?? DEFAULT_PCT });
      });
    });
    return out;
  }, [sellers, overrides]);

  const getRate = useCallback(
    (memberId: string, branch: Branch) => overrides[keyOf(memberId, branch)] ?? DEFAULT_PCT,
    [overrides],
  );

  const updateRate = useCallback((memberId: string, branch: Branch, pct: number) => {
    const v = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
    setOverrides((prev) => ({ ...prev, [keyOf(memberId, branch)]: v }));
  }, []);

  const computePayout = useCallback(
    (commission: Commission, policy: Policy | undefined) => {
      if (!policy?.assigneeId) return 0;
      if (commission.status !== "pago") return 0;
      const pct = overrides[keyOf(policy.assigneeId, policy.branch)] ?? DEFAULT_PCT;
      return Math.round(commission.amount * pct) / 100;
    },
    [overrides],
  );

  const value = useMemo<Ctx>(
    () => ({ rates, getRate, updateRate, computePayout }),
    [rates, getRate, updateRate, computePayout],
  );

  return <SellerCtx.Provider value={value}>{children}</SellerCtx.Provider>;
}

export function useSellerCommissionStore() {
  const ctx = useContext(SellerCtx);
  if (!ctx) throw new Error("useSellerCommissionStore must be used inside SellerCommissionStoreProvider");
  return ctx;
}
