import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { policies as seedPolicies, type Policy } from "@/lib/mock/data";

type AddPolicyInput = Omit<Policy, "id" | "number" | "renewedFromId" | "renewedToId">;
type RenewPolicyInput = AddPolicyInput;

type Ctx = {
  policies: Policy[];
  addPolicy: (input: AddPolicyInput) => Policy;
  updatePolicy: (id: string, patch: Partial<AddPolicyInput>) => void;
  deletePolicy: (id: string) => void;
  renewPolicy: (sourceId: string, input: RenewPolicyInput) => Policy;
  isAlreadyRenewed: (policyId: string) => boolean;
  renewalChainOf: (policyId: string) => Policy[];
  renewalIndexOf: (policyId: string) => number;
  findPolicy: (id: string) => Policy | undefined;
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

  const updatePolicy = useCallback((id: string, patch: Partial<AddPolicyInput>) => {
    setPolicies((arr) =>
      arr.map((p) =>
        p.id === id
          ? { ...p, ...patch, id: p.id, number: p.number, renewedFromId: p.renewedFromId, renewedToId: p.renewedToId }
          : p,
      ),
    );
  }, []);

  const renewPolicy = useCallback((sourceId: string, input: RenewPolicyInput) => {
    let created!: Policy;
    setPolicies((arr) => {
      const source = arr.find((p) => p.id === sourceId);
      if (!source) return arr;
      const newId = `p${Date.now()}`;
      created = {
        id: newId,
        number: nextPolicyNumber(arr),
        ...input,
        renewedFromId: sourceId,
      };
      return [
        created,
        ...arr.map((p) =>
          p.id === sourceId
            ? { ...p, status: "renovada" as const, renewedToId: newId }
            : p,
        ),
      ];
    });
    return created;
  }, []);

  const deletePolicy = useCallback((id: string) => {
    setPolicies((arr) => {
      const target = arr.find((p) => p.id === id);
      if (!target) return arr;
      return arr
        .filter((p) => p.id !== id)
        .map((p) => {
          if (target.renewedFromId && p.id === target.renewedFromId) {
            const { renewedToId: _t, ...rest } = p;
            return rest as Policy;
          }
          if (target.renewedToId && p.id === target.renewedToId) {
            const { renewedFromId: _f, ...rest } = p;
            return rest as Policy;
          }
          return p;
        });
    });
  }, []);


  const findPolicy = useCallback(
    (id: string) => policies.find((p) => p.id === id),
    [policies],
  );

  const isAlreadyRenewed = useCallback(
    (policyId: string) => policies.some((p) => p.renewedFromId === policyId),
    [policies],
  );

  const renewalChainOf = useCallback(
    (policyId: string): Policy[] => {
      const byId = new Map(policies.map((p) => [p.id, p]));
      // walk backwards to the original
      let head = byId.get(policyId);
      while (head?.renewedFromId && byId.get(head.renewedFromId)) {
        head = byId.get(head.renewedFromId);
      }
      const chain: Policy[] = [];
      let cur = head;
      while (cur) {
        chain.push(cur);
        cur = cur.renewedToId ? byId.get(cur.renewedToId) : undefined;
      }
      return chain;
    },
    [policies],
  );

  const renewalIndexOf = useCallback(
    (policyId: string) => {
      const chain = renewalChainOf(policyId);
      return chain.findIndex((p) => p.id === policyId);
    },
    [renewalChainOf],
  );

  const value = useMemo(
    () => ({
      policies,
      addPolicy,
      updatePolicy,
      deletePolicy,
      renewPolicy,
      isAlreadyRenewed,
      renewalChainOf,
      renewalIndexOf,
      findPolicy,
    }),
    [policies, addPolicy, updatePolicy, deletePolicy, renewPolicy, isAlreadyRenewed, renewalChainOf, renewalIndexOf, findPolicy],
  );

  return <PolicyCtx.Provider value={value}>{children}</PolicyCtx.Provider>;
}

export function usePolicies() {
  const c = useContext(PolicyCtx);
  if (!c) throw new Error("usePolicies must be used within PolicyStoreProvider");
  return c;
}

/** @deprecated Use `usePolicies()`. Alias mantido para compatibilidade. */
export const usePolicyStore = usePolicies;
