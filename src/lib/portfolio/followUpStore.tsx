/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { FollowUp, FollowUpStatus } from "@/lib/mock/data";
import {
  createFollowUp as createFollowUpFn,
  deleteFollowUp as deleteFollowUpFn,
  listFollowUps,
  updateFollowUp as updateFollowUpFn,
} from "@/lib/portfolio/carteira.functions";

type AddFollowUpInput = Omit<FollowUp, "id" | "createdAt" | "updatedAt">;

type Ctx = {
  followUps: FollowUp[];
  isLoading: boolean;
  addFollowUp: (input: AddFollowUpInput) => Promise<FollowUp>;
  updateFollowUp: (id: string, patch: Partial<AddFollowUpInput>) => Promise<void>;
  deleteFollowUp: (id: string) => Promise<void>;
  changeStatus: (id: string, status: FollowUpStatus) => Promise<void>;
  listByClient: (clientId: string) => FollowUp[];
  listByDateRange: (start: string, end: string) => FollowUp[];
  listTodayAndTomorrow: (referenceDate?: string) => FollowUp[];
};

const FollowUpCtx = createContext<Ctx | null>(null);

export const FOLLOWUPS_KEY = ["follow-ups"] as const;

export function FollowUpStoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const fetchFollowUps = useServerFn(listFollowUps);
  const create = useServerFn(createFollowUpFn);
  const update = useServerFn(updateFollowUpFn);
  const remove = useServerFn(deleteFollowUpFn);

  const { data, isLoading } = useQuery({
    queryKey: FOLLOWUPS_KEY,
    queryFn: () => fetchFollowUps(),
  });

  const followUps = data ?? [];

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: FOLLOWUPS_KEY });
  }, [qc]);

  const createMutation = useMutation({
    mutationFn: (input: AddFollowUpInput) => create({ data: input }),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; patch: Partial<AddFollowUpInput> }) => update({ data: vars }),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
  });

  const addFollowUp = useCallback(
    (input: AddFollowUpInput) => createMutation.mutateAsync(input),
    [createMutation],
  );
  const updateFollowUp = useCallback(
    async (id: string, patch: Partial<AddFollowUpInput>) => {
      await updateMutation.mutateAsync({ id, patch });
    },
    [updateMutation],
  );
  const deleteFollowUp = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );
  const changeStatus = useCallback(
    async (id: string, status: FollowUpStatus) => {
      await updateMutation.mutateAsync({ id, patch: { status } });
    },
    [updateMutation],
  );

  const listByClient = useCallback(
    (clientId: string) =>
      followUps
        .filter((f) => f.clientId === clientId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [followUps],
  );

  const listByDateRange = useCallback(
    (start: string, end: string) =>
      followUps
        .filter((f) => f.date >= start && f.date <= end)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [followUps],
  );

  const listTodayAndTomorrow = useCallback(
    (referenceDate?: string) => {
      const ref = referenceDate ? new Date(referenceDate) : new Date();
      const today = ref.toISOString().slice(0, 10);
      const tomorrow = new Date(ref);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);
      return followUps
        .filter((f) => (f.date === today || f.date === tomorrowStr) && f.status === "agendado")
        .sort((a, b) => {
          const ta = a.time ?? "23:59";
          const tb = b.time ?? "23:59";
          if (ta !== tb) return ta.localeCompare(tb);
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
    },
    [followUps],
  );

  const value = useMemo<Ctx>(
    () => ({
      followUps,
      isLoading,
      addFollowUp,
      updateFollowUp,
      deleteFollowUp,
      changeStatus,
      listByClient,
      listByDateRange,
      listTodayAndTomorrow,
    }),
    [
      followUps,
      isLoading,
      addFollowUp,
      updateFollowUp,
      deleteFollowUp,
      changeStatus,
      listByClient,
      listByDateRange,
      listTodayAndTomorrow,
    ],
  );

  return <FollowUpCtx.Provider value={value}>{children}</FollowUpCtx.Provider>;
}

export function useFollowUps() {
  const c = useContext(FollowUpCtx);
  if (!c) throw new Error("useFollowUps must be used within FollowUpStoreProvider");
  return c;
}

/** @deprecated Use `useFollowUps()`. Alias mantido para compatibilidade. */
export { useFollowUps as useFollowUpStore };
