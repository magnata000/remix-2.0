/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Branch, Commission, Policy } from "@/lib/mock/data";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_SELLER_PCT = 30;

type RateRow = { member_id: string; branch: Branch; pct: number };

type Ctx = {
  getRate: (memberId: string, branch: Branch) => number;
  updateRate: (memberId: string, branch: Branch, pct: number) => void;
  computePayout: (commission: Commission, policy: Policy | undefined) => number;
};

const SellerCtx = createContext<Ctx | null>(null);
const KEY = ["seller-commission-rates"];

/** Taxas de repasse por vendedor × ramo, persistidas no banco (padrão 30%). */
export function SellerCommissionStoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_commission_rates")
        .select("member_id, branch, pct");
      if (error) throw error;
      return (data ?? []) as RateRow[];
    },
    staleTime: 60_000,
  });

  const map = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(`${r.member_id}::${r.branch}`, Number(r.pct)));
    return m;
  }, [rows]);

  const getRate = useCallback(
    (memberId: string, branch: Branch) => map.get(`${memberId}::${branch}`) ?? DEFAULT_SELLER_PCT,
    [map],
  );

  const mut = useMutation({
    mutationFn: async (r: RateRow) => {
      const { error } = await supabase
        .from("seller_commission_rates")
        .upsert(r as never, { onConflict: "member_id,branch" });
      if (error) throw error;
    },
    onMutate: (r) => {
      qc.setQueryData<RateRow[]>(KEY, (old = []) => [
        ...old.filter((x) => !(x.member_id === r.member_id && x.branch === r.branch)),
        r,
      ]);
    },
    onError: (e) => {
      toast.error(`Não foi possível salvar o percentual: ${e instanceof Error ? e.message : e}`);
      qc.invalidateQueries({ queryKey: KEY });
    },
  });

  const updateRate = useCallback(
    (memberId: string, branch: Branch, pct: number) => {
      const v = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
      mut.mutate({ member_id: memberId, branch, pct: v });
    },
    [mut],
  );

  const computePayout = useCallback(
    (commission: Commission, policy: Policy | undefined) => {
      if (!policy?.assigneeId) return 0;
      if (commission.status !== "pago") return 0;
      return Math.round(commission.amount * getRate(policy.assigneeId, policy.branch)) / 100;
    },
    [getRate],
  );

  const value = useMemo<Ctx>(
    () => ({ getRate, updateRate, computePayout }),
    [getRate, updateRate, computePayout],
  );

  return <SellerCtx.Provider value={value}>{children}</SellerCtx.Provider>;
}

export function useSellerCommissionStore() {
  const ctx = useContext(SellerCtx);
  if (!ctx)
    throw new Error("useSellerCommissionStore must be used inside SellerCommissionStoreProvider");
  return ctx;
}
