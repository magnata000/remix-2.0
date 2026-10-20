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
  .handler(async ({ context }) =>
    check(
      await context.supabase
        .from("commissions")
        .select(
          "id, policy_id, policy_number, client_name, client_id, insurer_id, competencia, base_calculo, percentual, modelo_pagamento, valor_previsto, status, commission_events(id, tipo, valor, motivo, observacao, documento_referencia, criado_por, criado_em, installment_id), commission_installments(id, numero_parcela, competencia, valor_previsto, status), commission_payouts(id, user_id, percentual_repasse, valor_devido, valor_pago)",
        )
        .order("competencia", { ascending: true }),
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
