/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  type Commission,
  type CommissionStatusValue,
  type Policy,
} from "@/lib/mock/data";
import {
  generateCommissionSchedule,
  expectedRecurrencesUntil,
  branchToProduct,
} from "@/lib/financial/commissionEngine";
import { useCommissionConfigStore } from "@/lib/financial/commissionConfigStore";
import { usePolicies } from "@/lib/portfolio/policyStore";
import { toast } from "sonner";
import {
  listCommissions,
  bulkCreateCommissions,
  updateCommissionStatus as updateCommissionStatusFn,
  patchCommission as patchCommissionFn,
  deleteCommissionsByPolicy as deleteCommissionsByPolicyFn,
} from "@/lib/financial/commission.functions";

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
  const queryClient = useQueryClient();
  const fetchFn = useServerFn(listCommissions);
  const createFn = useServerFn(bulkCreateCommissions);
  const updateFn = useServerFn(updateCommissionStatusFn);
  const patchFn = useServerFn(patchCommissionFn);
  const deleteFn = useServerFn(deleteCommissionsByPolicyFn);

  const { data: commissions = [] } = useQuery({
    queryKey: ["commissions"],
    queryFn: () => fetchFn(),
  });

  const { configForPolicy } = useCommissionConfigStore();
  const { policies } = usePolicies();

  const setCommissions = useCallback(
    (updater: (prev: Commission[]) => Commission[]) => {
      const next = updater(queryClient.getQueryData<Commission[]>(["commissions"]) ?? []);
      queryClient.setQueryData(["commissions"], next);
    },
    [queryClient],
  );

  const updateCommissionStatus = useCallback(
    (id: string, status: CommissionStatus) => {
      const current = commissions.find((c) => c.id === id);
      if (!current) return;
      const paidAt = status === "pago" && !current.paidAt ? new Date().toISOString() : current.paidAt;
      const refundedAt =
        status === "devolvido" && !current.refundedAt ? new Date().toISOString() : current.refundedAt;
      const refundReason =
        status === "devolvido" && !current.refundReason
          ? `Cancelamento da apólice ${current.policyNumber}`
          : current.refundReason;

      setCommissions((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status,
                paidAt,
                refundedAt,
                refundReason,
              }
            : c,
        ),
      );

      updateFn({
        data: {
          id,
          status,
          paidAt,
          refundedAt,
          refundReason,
        },
      }).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Falha ao salvar status da comissão");
        queryClient.invalidateQueries({ queryKey: ["commissions"] });
      });
    },
    [commissions, setCommissions, updateFn, queryClient],
  );

  const patchCommission = useCallback(
    (id: string, patch: Partial<Commission>) => {
      setCommissions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      patchFn({ data: { id, patch } }).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Falha ao atualizar comissão");
        queryClient.invalidateQueries({ queryKey: ["commissions"] });
      });
    },
    [setCommissions, patchFn, queryClient],
  );

  const createMutation = useMutation({
    mutationFn: (items: Commission[]) => createFn({ data: items }),
    onSuccess: (created) => {
      queryClient.setQueryData<Commission[]>(["commissions"], (prev) => [...created, ...(prev ?? [])]);
    },
  });

  const generateForPolicy = useCallback(
    (policy: Policy): Commission[] => {
      const config = configForPolicy(policy);
      const created = generateCommissionSchedule(policy, config);
      if (created.length === 0) return [];
      createMutation.mutate(created);
      return created;
    },
    [configForPolicy, createMutation],
  );

  // Efeito: garantir recorrências mensais para apólices Saúde até o mês corrente.
  // Usa um ref para não duplicar comissões durante o carregamento inicial.
  const generatedRecurrencesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const reference = new Date();
    const additions: Commission[] = [];
    const keys = new Set<string>();
    for (const policy of policies) {
      if (branchToProduct(policy.branch) !== "saude") continue;
      if (policy.status === "cancelada" || policy.status === "vencida") continue;
      const existing = commissions.filter((c) => c.policyId === policy.id && c.kind === "recorrencia");
      const existingDates = new Set(existing.map((c) => c.dueDate));
      const config = configForPolicy(policy);
      const novos = expectedRecurrencesUntil(policy, config, reference, existingDates);
      novos.forEach((c) => {
        const key = `${policy.id}:${c.dueDate}`;
        if (!generatedRecurrencesRef.current.has(key)) {
          additions.push(c);
          keys.add(key);
        }
      });
    }
    if (additions.length > 0) {
      keys.forEach((k) => generatedRecurrencesRef.current.add(k));
      createMutation.mutate(additions);
    }
  }, [policies, configForPolicy, createMutation]);

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
    const nextMap = new Map<string, Policy["status"]>(policies.map((p) => [p.id, p.status]));
    prevStatusRef.current = nextMap;

    if (transitions.length === 0) return;

    const refundedAt = new Date().toISOString();
    const originalById = new Map(commissions.map((c) => [c.id, c]));
    let devolvidas = 0;
    let canceladas = 0;

    const next = commissions.map((c) => {
      const t = transitions.find((tr) => tr.policy.id === c.policyId);
      if (!t) return c;
      const original = originalById.get(c.id);
      if (c.status === "pago" && original?.status !== "devolvido") {
        devolvidas++;
        return {
          ...c,
          status: "devolvido" as const,
          refundedAt,
          refundReason: `Cancelamento da apólice ${t.policy.number}`,
        };
      }
      if ((c.status === "pendente" || c.status === "atrasado") && original?.status !== "cancelada") {
        canceladas++;
        return { ...c, status: "cancelada" as const };
      }
      return c;
    });

    if (devolvidas + canceladas > 0) {
      const parts: string[] = [];
      if (devolvidas) parts.push(`${devolvidas} devolvida(s)`);
      if (canceladas) parts.push(`${canceladas} cancelada(s)`);
      toast.info(`Comissões atualizadas: ${parts.join(" · ")}`);

      setCommissions(() => next);
      next.forEach((c) => {
        const original = originalById.get(c.id);
        if (c.status !== original?.status) {
          updateFn({
            data: {
              id: c.id,
              status: c.status,
              paidAt: c.paidAt,
              refundedAt: c.refundedAt,
              refundReason: c.refundReason,
            },
          }).catch(() => queryClient.invalidateQueries({ queryKey: ["commissions"] }));
        }
      });
    }
  }, [policies, commissions, setCommissions, updateFn, queryClient]);

  const scheduleOfPolicy = useCallback(
    (policyId: string) =>
      commissions
        .filter((c) => c.policyId === policyId)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [commissions],
  );

  const deleteByPolicy = useCallback(
    (policyId: string) => {
      queryClient.setQueryData<Commission[]>(["commissions"], (prev) =>
        (prev ?? []).filter((c) => c.policyId !== policyId),
      );
      deleteFn({ data: { policyId } }).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Falha ao excluir comissões");
        queryClient.invalidateQueries({ queryKey: ["commissions"] });
      });
    },
    [deleteFn, queryClient],
  );

  const value = useMemo<Ctx>(
    () => ({
      commissions,
      updateCommissionStatus,
      patchCommission,
      generateForPolicy,
      scheduleOfPolicy,
      deleteByPolicy,
    }),
    [
      commissions,
      updateCommissionStatus,
      patchCommission,
      generateForPolicy,
      scheduleOfPolicy,
      deleteByPolicy,
    ],
  );

  return <CommissionContext.Provider value={value}>{children}</CommissionContext.Provider>;
}

export function useCommissionStore() {
  const ctx = useContext(CommissionContext);
  if (!ctx) throw new Error("useCommissionStore must be used inside CommissionStoreProvider");
  return ctx;
}
