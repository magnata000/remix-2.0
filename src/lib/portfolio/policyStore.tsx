import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { policies as seedPolicies, type Policy } from "@/lib/mock/data";

type AddPolicyInput = Omit<Policy, "id" | "number">;

type Ctx = {
  policies: Policy[];
  addPolicy: (input: AddPolicyInput) => Policy;
};

const PolicyCtx = createContext<Ctx | null>(null);

function nextPolicyNumber(existing: Policy[]): string {
  const year = new Date().getFullYear();
  let max = 0;
  existing.forEach((p) => {
    const m = p.number.match(/(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  });
  return `APO-${year}-${String(max + 1).padStart(4, "0")}`;
}

export function PolicyStoreProvider({ children }: { children: ReactNode }) {
  const [policies, setPolicies] = useState<Policy[]>(() => seedPolicies);

  const addPolicy = useCallback((input: AddPolicyInput) => {
    let created!: Policy;
    setPolicies((arr) => {
      created = {
        id: `p${Date.now()}`,
        number: nextPolicyNumber(arr),
        ...input,
      };
      return [created, ...arr];
    });
    return created;
  }, []);

  const value = useMemo(() => ({ policies, addPolicy }), [policies, addPolicy]);

  return <PolicyCtx.Provider value={value}>{children}</PolicyCtx.Provider>;
}

export function usePolicyStore() {
  const c = useContext(PolicyCtx);
  if (!c) throw new Error("usePolicyStore must be used within PolicyStoreProvider");
  return c;
}
