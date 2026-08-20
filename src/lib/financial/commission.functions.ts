import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Commission, CommissionStatusValue } from "@/lib/mock/data";

type Row = {
  id: string;
  policy_id: string;
  policy_number: string;
  client_name: string;
  insurer: string;
  amount: number;
  due_date: string;
  status: string;
  kind: string | null;
  installment_index: number | null;
  installment_total: number | null;
  paid_at: string | null;
  refunded_at: string | null;
  refund_reason?: string | null;
  created_at: string;
  updated_at: string;
};

const COMMISSION_SELECT = "id, policy_id, policy_number, client_name, insurer, amount, due_date, status, kind, installment_index, installment_total, paid_at, refunded_at, refund_reason, created_at, updated_at";

function mapCommission(r: Row): Commission {
  return {
    id: r.id,
    policyId: r.policy_id,
    policyNumber: r.policy_number,
    clientName: r.client_name,
    insurer: r.insurer as Commission["insurer"],
    amount: r.amount,
    dueDate: r.due_date,
    status: r.status as CommissionStatusValue,
    kind: (r.kind ?? undefined) as Commission["kind"],
    installmentIndex: r.installment_index ?? undefined,
    installmentTotal: r.installment_total ?? undefined,
    paidAt: r.paid_at ?? undefined,
    refundedAt: r.refunded_at ?? undefined,
    refundReason: r.refund_reason ?? undefined,
  };
}

export type CommissionInput = Omit<Commission, "id" | "paidAt" | "refundedAt" | "refundReason">;

export const listCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Commission[]> => {
    const { data, error } = await context.supabase
      .from("commissions")
      .select(COMMISSION_SELECT)
      .order("due_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapCommission(r as Row));
  });

export const bulkCreateCommissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CommissionInput[]) => {
    if (!Array.isArray(data)) throw new Error("Payload deve ser uma lista");
    for (const c of data) {
      if (!c.policyId) throw new Error("Comissão deve estar vinculada a uma apólice");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<Commission[]> => {
    if (data.length === 0) return [];
    const rows = data.map((c) => ({
      policy_id: c.policyId as string,
      policy_number: c.policyNumber,
      client_name: c.clientName,
      insurer: c.insurer,
      amount: c.amount,
      due_date: c.dueDate,
      status: c.status,
      kind: c.kind ?? null,
      installment_index: c.installmentIndex ?? null,
      installment_total: c.installmentTotal ?? null,
    }));
    const { data: inserted, error } = await context.supabase
      .from("commissions")
      .insert(rows as any)
      .select(COMMISSION_SELECT);
    if (error) throw new Error(error.message);
    return (inserted ?? []).map((r) => mapCommission(r as Row));
  });

export const updateCommissionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      status: CommissionStatusValue;
      paidAt?: string;
      refundedAt?: string;
      refundReason?: string;
    }) => data,
  )
  .handler(async ({ data, context }): Promise<Commission> => {
    const cols: Record<string, unknown> = { status: data.status };
    if (data.paidAt !== undefined) cols["paid_at"] = data.paidAt ?? null;
    if (data.refundedAt !== undefined) cols["refunded_at"] = data.refundedAt ?? null;
    if (data.refundReason !== undefined) cols["refund_reason"] = data.refundReason ?? null;
    const { data: row, error } = await context.supabase
      .from("commissions")
      .update(cols as any)
      .eq("id", data.id)
      .select(COMMISSION_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return mapCommission(row as Row);
  });

export const patchCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; patch: Partial<Commission> }) => data)
  .handler(async ({ data, context }): Promise<Commission> => {
    const p = data.patch;
    const cols: Record<string, unknown> = {};
    if (p.policyNumber !== undefined) cols["policy_number"] = p.policyNumber;
    if (p.clientName !== undefined) cols["client_name"] = p.clientName;
    if (p.insurer !== undefined) cols["insurer"] = p.insurer;
    if (p.amount !== undefined) cols["amount"] = p.amount;
    if (p.dueDate !== undefined) cols["due_date"] = p.dueDate;
    if (p.status !== undefined) cols["status"] = p.status;
    if (p.kind !== undefined) cols["kind"] = p.kind ?? null;
    if (p.installmentIndex !== undefined) cols["installment_index"] = p.installmentIndex ?? null;
    if (p.installmentTotal !== undefined) cols["installment_total"] = p.installmentTotal ?? null;
    if (p.paidAt !== undefined) cols["paid_at"] = p.paidAt ?? null;
    if (p.refundedAt !== undefined) cols["refunded_at"] = p.refundedAt ?? null;
    if (p.refundReason !== undefined) cols["refund_reason"] = p.refundReason ?? null;
    const { data: row, error } = await context.supabase
      .from("commissions")
      .update(cols as any)
      .eq("id", data.id)
      .select(COMMISSION_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return mapCommission(row as Row);
  });

export const deleteCommissionsByPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { policyId: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("commissions").delete().eq("policy_id", data.policyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
