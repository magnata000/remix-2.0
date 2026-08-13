import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  Beneficiary,
  Branch,
  Client,
  ClientStatus,
  FollowUp,
  FollowUpStatus,
  FollowUpType,
  Insurer,
  Policy,
  PolicyStatus,
} from "@/lib/mock/data";

/* ------------------------------------------------------------------ helpers */

type Row = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const n = (v: unknown): number | undefined =>
  v === null || v === undefined ? undefined : Number(v);

function mapClient(r: Row): Client {
  return {
    id: s(r["id"]),
    name: s(r["name"]),
    email: s(r["email"]),
    phone: s(r["phone"]),
    document: s(r["document"]),
    birthDate: (r["birth_date"] as string | null) ?? undefined,
    statusOverride: (r["status_override"] as ClientStatus | null) ?? undefined,
  };
}

function mapBeneficiary(r: Row): Beneficiary {
  return {
    id: s(r["id"]),
    title: r["title"] as Beneficiary["title"],
    titleCustom: (r["title_custom"] as string | null) ?? undefined,
    name: s(r["name"]),
    birthDate: s(r["birth_date"]),
    cpf: s(r["cpf"]),
  };
}

function mapPolicy(r: Row): Policy {
  const client = (r["clients"] as Row | null) ?? null;
  const beneficiaries = (r["beneficiaries"] as Row[] | null) ?? [];
  return {
    id: s(r["id"]),
    number: s(r["number"]),
    clientName: client ? s(client["name"]) : "",
    branch: r["branch"] as Branch,
    insurer: r["insurer"] as Insurer,
    premium: Number(r["premium"] ?? 0),
    startDate: s(r["start_date"]),
    endDate: (r["end_date"] as string | null) ?? "",
    status: r["status"] as PolicyStatus,
    renewedFromId: (r["renewed_from_id"] as string | null) ?? undefined,
    renewedToId: (r["renewed_to_id"] as string | null) ?? undefined,
    commissionPct: n(r["commission_pct"]),
    commissionScheme: (r["commission_scheme"] as Policy["commissionScheme"]) ?? undefined,
    commissionInstallments: n(r["commission_installments"]),
    agenciamentoSchedule: (r["agenciamento_schedule"] as number[] | null)?.map(Number) ?? undefined,
    recorrenciaPct: n(r["recorrencia_pct"]),
    comissaoLiquida: (r["comissao_liquida"] as boolean | null) ?? undefined,
    taxaImposto: n(r["taxa_imposto"]),
    healthAnniversary: (r["health_anniversary"] as string | null) ?? undefined,
    healthInitialValue: n(r["health_initial_value"]),
    healthCategory: (r["health_category"] as string | null) ?? undefined,
    healthCoparticipation: (r["health_coparticipation"] as boolean | null) ?? undefined,
    beneficiaries: beneficiaries.length ? beneficiaries.map(mapBeneficiary) : undefined,
    consortiumGroup: (r["consortium_group"] as string | null) ?? undefined,
    consortiumQuota: (r["consortium_quota"] as string | null) ?? undefined,
    consortiumType: (r["consortium_type"] as Policy["consortiumType"]) ?? undefined,
    assigneeId: (r["assignee_id"] as string | null) ?? undefined,
  };
}

function mapFollowUp(r: Row): FollowUp {
  const client = (r["clients"] as Row | null) ?? null;
  return {
    id: s(r["id"]),
    clientId: s(r["client_id"]),
    clientName: client ? s(client["name"]) : "",
    date: s(r["date"]),
    time: (r["time"] as string | null) ?? undefined,
    type: r["type"] as FollowUpType,
    status: r["status"] as FollowUpStatus,
    notes: s(r["notes"]),
    createdTaskId: (r["created_task_id"] as string | null) ?? undefined,
    createdAt: s(r["created_at"]),
    updatedAt: s(r["updated_at"]),
  };
}

const POLICY_SELECT =
  "*, clients(name), beneficiaries(id, title, title_custom, name, birth_date, cpf)";

type PolicyInput = Partial<Omit<Policy, "id" | "number">>;

function policyColumns(input: PolicyInput, clientId?: string) {
  const out: Record<string, unknown> = {};
  if (clientId) out["client_id"] = clientId;
  if (input.branch !== undefined) out["branch"] = input.branch;
  if (input.insurer !== undefined) out["insurer"] = input.insurer;
  if (input.premium !== undefined) out["premium"] = input.premium;
  if (input.startDate !== undefined) out["start_date"] = input.startDate;
  if (input.endDate !== undefined) out["end_date"] = input.endDate || null;
  if (input.status !== undefined) out["status"] = input.status;
  if (input.commissionPct !== undefined) out["commission_pct"] = input.commissionPct;
  if (input.commissionScheme !== undefined) out["commission_scheme"] = input.commissionScheme;
  if (input.commissionInstallments !== undefined)
    out["commission_installments"] = input.commissionInstallments;
  if (input.agenciamentoSchedule !== undefined)
    out["agenciamento_schedule"] = input.agenciamentoSchedule;
  if (input.recorrenciaPct !== undefined) out["recorrencia_pct"] = input.recorrenciaPct;
  if (input.comissaoLiquida !== undefined) out["comissao_liquida"] = input.comissaoLiquida;
  if (input.taxaImposto !== undefined) out["taxa_imposto"] = input.taxaImposto;
  if (input.healthAnniversary !== undefined)
    out["health_anniversary"] = input.healthAnniversary || null;
  if (input.healthInitialValue !== undefined) out["health_initial_value"] = input.healthInitialValue;
  if (input.healthCategory !== undefined) out["health_category"] = input.healthCategory;
  if (input.healthCoparticipation !== undefined)
    out["health_coparticipation"] = input.healthCoparticipation;
  if (input.consortiumGroup !== undefined) out["consortium_group"] = input.consortiumGroup;
  if (input.consortiumQuota !== undefined) out["consortium_quota"] = input.consortiumQuota;
  if (input.consortiumType !== undefined) out["consortium_type"] = input.consortiumType;
  return out;
}

function nextNumber(existing: string[]): string {
  const year = new Date().getFullYear();
  let max = 0;
  existing.forEach((num) => {
    const m = num.match(/(\d+)$/);
    if (m) {
      const v = parseInt(m[1]!, 10);
      if (v > max) max = v;
    }
  });
  return `APO-${year}-${String(max + 1).padStart(4, "0")}`;
}

/* ------------------------------------------------------------------ clients */

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Client[]> => {
    const { data, error } = await context.supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapClient(r as Row));
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Omit<Client, "id">) => data)
  .handler(async ({ data, context }): Promise<Client> => {
    const { data: row, error } = await context.supabase
      .from("clients")
      .insert({
        name: data.name,
        email: data.email ?? "",
        phone: data.phone ?? "",
        document: data.document ?? "",
        birth_date: data.birthDate || null,
        status_override: data.statusOverride ?? null,
        assignee_id: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapClient(row as Row);
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; patch: Partial<Omit<Client, "id">> }) => data)
  .handler(async ({ data, context }): Promise<Client> => {
    const p = data.patch;
    const cols: Record<string, unknown> = {};
    if (p.name !== undefined) cols["name"] = p.name;
    if (p.email !== undefined) cols["email"] = p.email;
    if (p.phone !== undefined) cols["phone"] = p.phone;
    if (p.document !== undefined) cols["document"] = p.document;
    if (p.birthDate !== undefined) cols["birth_date"] = p.birthDate || null;
    if (p.statusOverride !== undefined) cols["status_override"] = p.statusOverride ?? null;
    const { data: row, error } = await context.supabase
      .from("clients")
      .update(cols as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapClient(row as Row);
  });

export const setClientStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: ClientStatus }) => data)
  .handler(async ({ data, context }): Promise<Client> => {
    const { data: row, error } = await context.supabase
      .from("clients")
      .update({ status_override: data.status })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapClient(row as Row);
  });

/* ----------------------------------------------------------------- policies */

export const listPolicies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Policy[]> => {
    const { data, error } = await context.supabase
      .from("policies")
      .select(POLICY_SELECT)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapPolicy(r as Row));
  });

async function resolveClientId(
  supabase: { from: (t: string) => any },
  clientName: string,
  userId: string,
): Promise<string> {
  const { data: found } = await supabase
    .from("clients")
    .select("id")
    .eq("name", clientName)
    .limit(1)
    .maybeSingle();
  if (found?.id) return found.id as string;
  const { data: created, error } = await supabase
    .from("clients")
    .insert({ name: clientName, assignee_id: userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

async function insertPolicy(
  context: { supabase: any; userId: string },
  input: PolicyInput & { clientName: string; beneficiaries?: Beneficiary[] },
  renewedFromId?: string,
): Promise<Policy> {
  const clientId = await resolveClientId(context.supabase, input.clientName, context.userId);
  const { data: numbers } = await context.supabase.from("policies").select("number");
  const number = nextNumber(((numbers ?? []) as { number: string }[]).map((r) => r.number));

  const { data: row, error } = await context.supabase
    .from("policies")
    .insert({
      ...policyColumns(input, clientId),
      number,
      assignee_id: context.userId,
      renewed_from_id: renewedFromId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const policyId = row.id as string;

  if (input.beneficiaries?.length) {
    const { error: bErr } = await context.supabase.from("beneficiaries").insert(
      input.beneficiaries.map((b) => ({
        policy_id: policyId,
        title: b.title,
        title_custom: b.titleCustom ?? null,
        name: b.name,
        birth_date: b.birthDate,
        cpf: b.cpf ?? "",
      })),
    );
    if (bErr) throw new Error(bErr.message);
  }

  const { data: full, error: fErr } = await context.supabase
    .from("policies")
    .select(POLICY_SELECT)
    .eq("id", policyId)
    .single();
  if (fErr) throw new Error(fErr.message);
  return mapPolicy(full as Row);
}

export const createPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PolicyInput & { clientName: string }) => data)
  .handler(async ({ data, context }): Promise<Policy> => insertPolicy(context as never, data));

export const renewPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sourceId: string; input: PolicyInput & { clientName: string } }) => data)
  .handler(async ({ data, context }): Promise<Policy> => {
    const created = await insertPolicy(context as never, data.input, data.sourceId);
    const { error } = await context.supabase
      .from("policies")
      .update({ status: "renovada", renewed_to_id: created.id })
      .eq("id", data.sourceId);
    if (error) throw new Error(error.message);
    return created;
  });

export const updatePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; patch: PolicyInput }) => data)
  .handler(async ({ data, context }): Promise<Policy> => {
    const clientId = data.patch.clientName
      ? await resolveClientId(context.supabase, data.patch.clientName, context.userId)
      : undefined;

    const { error } = await context.supabase
      .from("policies")
      .update(policyColumns(data.patch, clientId) as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.patch.beneficiaries) {
      await context.supabase.from("beneficiaries").delete().eq("policy_id", data.id);
      if (data.patch.beneficiaries.length) {
        const { error: bErr } = await context.supabase.from("beneficiaries").insert(
          data.patch.beneficiaries.map((b) => ({
            policy_id: data.id,
            title: b.title,
            title_custom: b.titleCustom ?? null,
            name: b.name,
            birth_date: b.birthDate,
            cpf: b.cpf ?? "",
          })),
        );
        if (bErr) throw new Error(bErr.message);
      }
    }

    const { data: full, error: fErr } = await context.supabase
      .from("policies")
      .select(POLICY_SELECT)
      .eq("id", data.id)
      .single();
    if (fErr) throw new Error(fErr.message);
    return mapPolicy(full as Row);
  });

export const deletePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("policies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------------------------------------- follow-ups */

const FOLLOWUP_SELECT = "*, clients(name)";

export const listFollowUps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FollowUp[]> => {
    const { data, error } = await context.supabase
      .from("follow_ups")
      .select(FOLLOWUP_SELECT)
      .order("date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapFollowUp(r as Row));
  });

type FollowUpInput = Omit<FollowUp, "id" | "createdAt" | "updatedAt">;

export const createFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: FollowUpInput) => data)
  .handler(async ({ data, context }): Promise<FollowUp> => {
    const { data: row, error } = await context.supabase
      .from("follow_ups")
      .insert({
        client_id: data.clientId,
        date: data.date,
        time: data.time ?? null,
        type: data.type,
        status: data.status,
        notes: data.notes ?? "",
        created_task_id: data.createdTaskId ?? null,
        created_by: context.userId,
      })
      .select(FOLLOWUP_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return mapFollowUp(row as Row);
  });

export const updateFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; patch: Partial<FollowUpInput> }) => data)
  .handler(async ({ data, context }): Promise<FollowUp> => {
    const p = data.patch;
    const cols: Record<string, unknown> = {};
    if (p.clientId !== undefined) cols["client_id"] = p.clientId;
    if (p.date !== undefined) cols["date"] = p.date;
    if (p.time !== undefined) cols["time"] = p.time || null;
    if (p.type !== undefined) cols["type"] = p.type;
    if (p.status !== undefined) cols["status"] = p.status;
    if (p.notes !== undefined) cols["notes"] = p.notes;
    if (p.createdTaskId !== undefined) cols["created_task_id"] = p.createdTaskId ?? null;
    const { data: row, error } = await context.supabase
      .from("follow_ups")
      .update(cols as never)
      .eq("id", data.id)
      .select(FOLLOWUP_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return mapFollowUp(row as Row);
  });

export const deleteFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("follow_ups").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
