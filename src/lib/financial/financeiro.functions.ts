import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["commission_event_type"];
type PaymentModel = Database["public"]["Enums"]["payment_model"];

/** Regras financeiras vivem no banco (RPCs); aqui só repassamos. */
function check<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export const listFinanceCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.from) || !/^\d{4}-\d{2}-\d{2}$/.test(d.to)) throw new Error("Período inválido");
    return d;
  })
  .handler(async ({ context, data }) =>
    check(
      await context.supabase
        .from("commissions")
        .select(
          "id, policy_id, policy_number, client_name, client_id, insurer_id, competencia, base_calculo, percentual, modelo_pagamento, valor_previsto, status, commission_events(id, tipo, valor, motivo, observacao, documento_referencia, criado_por, criado_em, installment_id), commission_installments(id, numero_parcela, competencia, valor_previsto, status), commission_payouts(id, user_id, percentual_repasse, valor_devido, valor_pago), insurers(name), policies(branches(name))",
        )
        .gte("competencia", data.from)
        .lte("competencia", data.to)
        .order("competencia", { ascending: true })
        .limit(1000),
    ),
  );

export const createPolicyCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      policyId: string;
      baseCalculo: number;
      percentual: number;
      modelo: PaymentModel;
      parcelas?: number;
      repasseUserId?: string;
      repassePct?: number;
    }) => d,
  )
  .handler(async ({ data, context }) =>
    check(
      await context.supabase.rpc("create_policy_commission", {
        _policy_id: data.policyId,
        _base_calculo: data.baseCalculo,
        _percentual: data.percentual,
        _modelo: data.modelo,
        _parcelas: data.parcelas ?? 1,
        _repasse_user: data.repasseUserId ?? undefined,
        _repasse_pct: data.repassePct ?? undefined,
      }),
    ),
  );

export const addCommissionEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { commissionId: string; tipo: EventType; valor: number; motivo?: string; observacao?: string; documento?: string; installmentId?: string }) => {
      if (!(d.valor >= 0)) throw new Error("Valor inválido");
      if (d.tipo.startsWith("estorno") && !d.motivo?.trim()) throw new Error("Motivo obrigatório para estornos");
      return d;
    },
  )
  .handler(async ({ data, context }) =>
    check(
      await context.supabase.rpc("add_commission_event", {
        _commission_id: data.commissionId,
        _tipo: data.tipo,
        _valor: data.valor,
        _motivo: data.motivo,
        _observacao: data.observacao,
        _documento: data.documento,
        _installment_id: data.installmentId,
      }),
    ),
  );

export const reconcileCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { commissionId: string; valorRecebido: number; tipoDiferenca?: EventType; motivo?: string; observacao?: string; installmentId?: string }) => d,
  )
  .handler(async ({ data, context }) =>
    check(
      await context.supabase.rpc("reconcile_commission", {
        _commission_id: data.commissionId,
        _valor_recebido: data.valorRecebido,
        _tipo_diferenca: data.tipoDiferenca,
        _motivo: data.motivo,
        _observacao: data.observacao,
        _installment_id: data.installmentId,
      }),
    ),
  );

export const setCommissionPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { commissionId: string; userId: string; pct: number }) => d)
  .handler(async ({ data, context }) =>
    check(await context.supabase.rpc("set_commission_payout", { _commission_id: data.commissionId, _user_id: data.userId, _pct: data.pct })),
  );

export const payCommissionPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { payoutId: string; valor: number; data?: string; observacao?: string }) => d)
  .handler(async ({ data, context }) =>
    check(
      await context.supabase.rpc("pay_commission_payout", {
        _payout_id: data.payoutId,
        _valor: data.valor,
        _data: data.data,
        _observacao: data.observacao,
      }),
    ),
  );

export const getMyPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [payouts, events] = await Promise.all([context.supabase.rpc("my_payouts"), context.supabase.rpc("my_payout_events")]);
    return { payouts: check(payouts), events: check(events) };
  });

export const payExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { expenseId: string; paidAt?: string }) => d)
  .handler(async ({ data, context }) => {
    check(await context.supabase.rpc("pay_expense", { _expense_id: data.expenseId, _paid_at: data.paidAt }));
    return { ok: true };
  });

type DreClass = Database["public"]["Enums"]["dre_classification"];

export const listExpensesYear = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year: number }) => d)
  .handler(async ({ data, context }) =>
    check(
      await context.supabase
        .from("expenses")
        .select("id, description, category, amount, due_date, status, paid_at, dre_classification, notes")
        .gte("due_date", `${data.year}-01-01`)
        .lte("due_date", `${data.year}-12-31`)
        .order("due_date", { ascending: true }),
    ),
  );

export const createExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { description: string; category: string; amount: number; dueDate: string; dre: DreClass; notes?: string }) => {
    if (!d.description.trim() || !(d.amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d.dueDate)) throw new Error("Dados inválidos");
    return d;
  })
  .handler(async ({ data, context }) => {
    const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    check(
      await context.supabase.from("expenses").insert({
        description: data.description.trim(),
        category: data.category.trim() || "Geral",
        amount: data.amount,
        due_date: data.dueDate,
        dre_classification: data.dre,
        notes: data.notes || null,
        status: data.dueDate < today ? "vencida" : "aguardando",
      }),
    );
    return { ok: true };
  });

/** Fluxo de caixa mensal: entradas = recebimentos de comissão; saídas = despesas pagas. */
export const getCashFlow = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year: number }) => d)
  .handler(async ({ data, context }) => {
    const from = `${data.year}-01-01`, to = `${data.year + 1}-01-01`;
    const [ins, outs] = await Promise.all([
      context.supabase.from("commission_events").select("valor, criado_em").eq("tipo", "pagamento").gte("criado_em", from).lt("criado_em", to).limit(10000),
      context.supabase.from("expenses").select("amount, paid_at").eq("status", "paga").gte("paid_at", from).lt("paid_at", to).limit(10000),
    ]);
    const months = Array.from({ length: 12 }, () => ({ entradas: 0, saidas: 0 }));
    for (const e of check(ins) ?? []) months[new Date(e.criado_em).getMonth()].entradas += Number(e.valor);
    for (const e of check(outs) ?? []) if (e.paid_at) months[new Date(e.paid_at).getMonth()].saidas += Number(e.amount);
    return months;
  });

/** Vendas (comissões) com repasse atribuído a um vendedor. */
export const listSellerSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) =>
    check(
      await context.supabase
        .from("commission_payouts")
        .select(
          "id, percentual_repasse, valor_devido, valor_pago, commissions(id, policy_number, client_name, competencia, valor_previsto, status, insurers(name), policies(branches(name)))",
        )
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(500),
    ),
  );
