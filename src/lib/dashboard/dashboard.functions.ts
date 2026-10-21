import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DashboardAnalytics } from "./analytics";

/** Uma única ida ao banco: toda a agregação acontece na RPC get_dashboard_analytics. */
export const getDashboardAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year: number; month: number; branchId: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("get_dashboard_analytics", {
      _year: data.year,
      _month: data.month,
      ...(data.branchId ? { _branch_id: data.branchId } : {}),
    });
    if (error) throw new Error(error.message);
    return res as unknown as DashboardAnalytics;
  });
