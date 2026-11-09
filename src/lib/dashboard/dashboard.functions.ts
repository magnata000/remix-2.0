import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ChurnItem, DashboardAnalytics } from "./analytics";

const spDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));

/** Agregação na RPC get_dashboard_analytics; a lista de perdas do churn replica o mesmo critério (CTE losses). */
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
    const result = res as unknown as DashboardAnalytics;

    // Janela de 12 meses (folga de 1 dia para o fuso de São Paulo).
    const from = new Date(Date.UTC(data.year, data.month - 12, 1) - 86_400_000).toISOString();
    const { data: events, error: evErr } = await context.supabase
      .from("portfolio_timeline")
      .select("entity_id, event_type, created_at")
      .eq("entity_type", "policy")
      .in("event_type", ["apolice_cancelada", "apolice_nao_renovada"])
      .gte("created_at", from)
      .order("created_at", { ascending: false });
    if (evErr) throw new Error(evErr.message);

    const latest = new Map<string, { id: string; type: string; at: string }>();
    for (const e of events ?? []) {
      const k = `${e.entity_id}|${e.event_type}`;
      if (!latest.has(k)) latest.set(k, { id: e.entity_id, type: e.event_type, at: e.created_at });
    }
    const ids = [...new Set([...latest.values()].map((l) => l.id))];
    const items: ChurnItem[] = [];
    if (ids.length) {
      const { data: pols, error: pErr } = await context.supabase
        .from("policies")
        .select("id, number, status, renewed_to_id, branch_id, branches(name), clients(name)")
        .in("id", ids);
      if (pErr) throw new Error(pErr.message);
      const byId = new Map((pols ?? []).map((p) => [p.id, p]));
      const months = new Set(result.churn.map((c) => c.month));
      for (const l of latest.values()) {
        const p = byId.get(l.id);
        if (!p) continue;
        if (data.branchId && p.branch_id !== data.branchId) continue;
        const branch = (p.branches as { name: string } | null)?.name ?? "";
        const ok = l.type === "apolice_cancelada"
          ? p.status === "cancelada"
          : p.status === "nao_renovada" && !p.renewed_to_id && !["Saúde", "Consórcio"].includes(branch);
        if (!ok) continue;
        const date = spDate(l.at);
        if (!months.has(date.slice(0, 7))) continue;
        items.push({
          id: p.id, number: p.number, client: (p.clients as { name: string } | null)?.name ?? null, branch,
          date, type: l.type === "apolice_cancelada" ? "cancelada" : "nao_renovada",
        });
      }
      items.sort((a, b) => b.date.localeCompare(a.date));
    }
    return { ...result, churn_items: items } as DashboardAnalytics;
  });
