/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Policy } from "@/lib/mock/data";
import {
  createPolicy as createPolicyFn,
  deletePolicy as deletePolicyFn,
  listPolicies,
  renewPolicy as renewPolicyFn,
  updatePolicy as updatePolicyFn,
} from "@/lib/portfolio/carteira.functions";

type AddPolicyInput = Omit<Policy, "id" | "number" | "renewedFromId" | "renewedToId">;
type RenewPolicyInput = AddPolicyInput;

type Ctx = {
  policies: Policy[];
  isLoading: boolean;
  addPolicy: (input: AddPolicyInput) => Promise<Policy>;
  updatePolicy: (id: string, patch: Partial<AddPolicyInput>) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
  renewPolicy: (sourceId: string, input: RenewPolicyInput) => Promise<Policy>;
  isAlreadyRenewed: (policyId: string) => boolean;
  renewalChainOf: (policyId: string) => Policy[];
  renewalIndexOf: (policyId: string) => number;
  findPolicy: (id: string) => Policy | undefined;
};

const PolicyCtx = createContext<Ctx | null>(null);

export const POLICIES_KEY = ["policies"] as const;

export function PolicyStoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const fetchPolicies = useServerFn(listPolicies);
  const create = useServerFn(createPolicyFn);
  const update = useServerFn(updatePolicyFn);
  const remove = useServerFn(deletePolicyFn);
  const renew = useServerFn(renewPolicyFn);

  const { data, isLoading } = useQuery({
    queryKey: POLICIES_KEY,
    queryFn: () => fetchPolicies(),
  });

  const policies = data ?? [];

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: POLICIES_KEY });
    void qc.invalidateQueries({ queryKey: ["clients"] });
  }, [qc]);

  const createMutation = useMutation({
    mutationFn: (input: AddPolicyInput) => create({ data: input }),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; patch: Partial<AddPolicyInput> }) => update({ data: vars }),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
  });
  const renewMutation = useMutation({
    mutationFn: (vars: { sourceId: string; input: RenewPolicyInput }) => renew({ data: vars }),
    onSuccess: invalidate,
  });

  const addPolicy = useCallback(
    (input: AddPolicyInput) => createMutation.mutateAsync(input),
    [createMutation],
  );
  const updatePolicy = useCallback(
    async (id: string, patch: Partial<AddPolicyInput>) => {
      await updateMutation.mutateAsync({ id, patch });
    },
    [updateMutation],
  );
  const deletePolicy = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );
  const renewPolicy = useCallback(
    (sourceId: string, input: RenewPolicyInput) => renewMutation.mutateAsync({ sourceId, input }),
    [renewMutation],
  );

  const findPolicy = useCallback((id: string) => policies.find((p) => p.id === id), [policies]);

  const isAlreadyRenewed = useCallback(
    (policyId: string) => policies.some((p) => p.renewedFromId === policyId),
    [policies],
  );

  const renewalChainOf = useCallback(
    (policyId: string): Policy[] => {
      const byId = new Map(policies.map((p) => [p.id, p]));
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
    (policyId: string) => renewalChainOf(policyId).findIndex((p) => p.id === policyId),
    [renewalChainOf],
  );

  const value = useMemo<Ctx>(
    () => ({
      policies,
      isLoading,
      addPolicy,
      updatePolicy,
      deletePolicy,
      renewPolicy,
      isAlreadyRenewed,
      renewalChainOf,
      renewalIndexOf,
      findPolicy,
    }),
    [
      policies,
      isLoading,
      addPolicy,
      updatePolicy,
      deletePolicy,
      renewPolicy,
      isAlreadyRenewed,
      renewalChainOf,
      renewalIndexOf,
      findPolicy,
    ],
  );

  return <PolicyCtx.Provider value={value}>{children}</PolicyCtx.Provider>;
}

export function usePolicies() {
  const c = useContext(PolicyCtx);
  if (!c) throw new Error("usePolicies must be used within PolicyStoreProvider");
  return c;
}

/** @deprecated Use `usePolicies()`. Alias mantido para compatibilidade. */
export { usePolicies as usePolicyStore };
