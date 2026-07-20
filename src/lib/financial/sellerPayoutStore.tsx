/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type SellerPayout = {
  id: string;
  sellerId: string;
  amount: number;
  paidAt: string; // ISO
  notes?: string;
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

type Ctx = {
  payouts: SellerPayout[];
  addPayout: (data: Omit<SellerPayout, "id">) => SellerPayout;
  removePayout: (id: string) => void;
  totalPaid: (sellerId: string) => number;
};

const PayoutCtx = createContext<Ctx | null>(null);

export function SellerPayoutStoreProvider({ children }: { children: ReactNode }) {
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);

  const addPayout = useCallback((data: Omit<SellerPayout, "id">) => {
    const p: SellerPayout = { ...data, id: newId() };
    setPayouts((prev) => [p, ...prev]);
    return p;
  }, []);

  const removePayout = useCallback((id: string) => {
    setPayouts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const totalPaid = useCallback(
    (sellerId: string) =>
      payouts.filter((p) => p.sellerId === sellerId).reduce((s, p) => s + p.amount, 0),
    [payouts],
  );

  const value = useMemo<Ctx>(
    () => ({ payouts, addPayout, removePayout, totalPaid }),
    [payouts, addPayout, removePayout, totalPaid],
  );

  return <PayoutCtx.Provider value={value}>{children}</PayoutCtx.Provider>;
}

export function useSellerPayoutStore() {
  const ctx = useContext(PayoutCtx);
  if (!ctx) throw new Error("useSellerPayoutStore must be used inside SellerPayoutStoreProvider");
  return ctx;
}
