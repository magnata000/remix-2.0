/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { followUps as seedFollowUps, type FollowUp, type FollowUpStatus } from "@/lib/mock/data";

type AddFollowUpInput = Omit<FollowUp, "id" | "createdAt" | "updatedAt">;

type Ctx = {
  followUps: FollowUp[];
  addFollowUp: (input: AddFollowUpInput) => FollowUp;
  updateFollowUp: (id: string, patch: Partial<AddFollowUpInput>) => void;
  deleteFollowUp: (id: string) => void;
  changeStatus: (id: string, status: FollowUpStatus) => void;
  listByClient: (clientId: string) => FollowUp[];
  listByDateRange: (start: string, end: string) => FollowUp[];
  listTodayAndTomorrow: (referenceDate?: string) => FollowUp[];
};

const FollowUpCtx = createContext<Ctx | null>(null);

export function FollowUpStoreProvider({ children }: { children: ReactNode }) {
  const [followUps, setFollowUps] = useState<FollowUp[]>(() => seedFollowUps);

  const addFollowUp = useCallback((input: AddFollowUpInput) => {
    const now = new Date().toISOString();
    const rec: FollowUp = {
      ...input,
      id: `fu${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    setFollowUps((arr) => [rec, ...arr]);
    return rec;
  }, []);

  const updateFollowUp = useCallback((id: string, patch: Partial<AddFollowUpInput>) => {
    setFollowUps((arr) =>
      arr.map((f) =>
        f.id === id
          ? {
              ...f,
              ...patch,
              clientName: patch.clientId ? patch.clientName ?? f.clientName : f.clientName,
              updatedAt: new Date().toISOString(),
            }
          : f,
      ),
    );
  }, []);

  const deleteFollowUp = useCallback((id: string) => {
    setFollowUps((arr) => arr.filter((f) => f.id !== id));
  }, []);

  const changeStatus = useCallback((id: string, status: FollowUpStatus) => {
    setFollowUps((arr) =>
      arr.map((f) => (f.id === id ? { ...f, status, updatedAt: new Date().toISOString() } : f)),
    );
  }, []);

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
      addFollowUp,
      updateFollowUp,
      deleteFollowUp,
      changeStatus,
      listByClient,
      listByDateRange,
      listTodayAndTomorrow,
    }),
    [followUps, addFollowUp, updateFollowUp, deleteFollowUp, changeStatus, listByClient, listByDateRange, listTodayAndTomorrow],
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
