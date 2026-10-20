import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Catálogos dinâmicos, Timeline e ações de negócio da Carteira (regras vivem no banco). */

export type CatalogItem = { id: string; name: string; code?: string; isActive: boolean };
export type ReasonInput = {
  policyId: string;
  motivo: "preco" | "relacionamento" | "concorrencia" | "experiencia" | "outro";
  categoria?: string;
  observacoes?: string;
};
export type TimelineEvent = {
  id: string;
  entityType: "client" | "policy";
  entityId: string;
  eventType: string;
  description: string;
  payload: unknown;
  relatedEntityId: string | null;
  createdBy: string | null;
  createdAt: string;
};

export const listBranches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CatalogItem[]> => {
    const { data, error } = await context.supabase.from("branches").select("id, code, name, is_active").order("name");
    if (error) throw new Error(error.message);
    return data.map((r) => ({ id: r.id, code: r.code, name: r.name, isActive: r.is_active }));
  });

export const listInsurers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CatalogItem[]> => {
    const { data, error } = await context.supabase.from("insurers").select("id, name, is_active").order("name");
    if (error) throw new Error(error.message);
    return data.map((r) => ({ id: r.id, name: r.name, isActive: r.is_active }));
  });

/** "Usar e adicionar novo": cria o item (código do ramo gerado no banco). */
export const createCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "branch" | "insurer"; name: string; code?: string }) => {
    const name = d.name.trim();
    if (!name) throw new Error("Nome obrigatório");
    return { ...d, name };
  })
  .handler(async ({ data, context }): Promise<CatalogItem> => {
    if (data.kind === "branch") {
      const { data: r, error } = await context.supabase
        .from("branches")
        .insert({ name: data.name, code: data.code?.toUpperCase() ?? null } as never)
        .select("id, code, name, is_active")
        .single();
      if (error) throw new Error(error.code === "23505" ? "Ramo ou código já existe — informe outro código" : error.message);
      return { id: r.id, code: r.code, name: r.name, isActive: r.is_active };
    }
    const { data: r, error } = await context.supabase
      .from("insurers")
      .insert({ name: data.name })
      .select("id, name, is_active")
      .single();
    if (error) throw new Error(error.code === "23505" ? "Seguradora já existe" : error.message);
    return { id: r.id, name: r.name, isActive: r.is_active };
  });

export const setCatalogItemActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "branch" | "insurer"; id: string; isActive: boolean }) => d)
  .handler(async ({ data, context }) => {
    const table = data.kind === "branch" ? "branches" : "insurers";
    const { error } = await context.supabase.from(table).update({ is_active: data.isActive }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { entityType: "client" | "policy"; entityId: string }) => d)
  .handler(async ({ data, context }): Promise<TimelineEvent[]> => {
    const { data: rows, error } = await context.supabase
      .from("portfolio_timeline")
      .select("*")
      .eq("entity_type", data.entityType)
      .eq("entity_id", data.entityId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows.map((r) => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      eventType: r.event_type,
      description: r.description,
      payload: r.payload,
      relatedEntityId: r.related_entity_id,
      createdBy: r.created_by,
      createdAt: r.created_at,
    }));
  });

export const cancelPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ReasonInput) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cancel_policy", {
      _policy_id: data.policyId,
      _motivo: data.motivo,
      _categoria: data.categoria ?? "",
      _observacoes: data.observacoes ?? "",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registerPolicyReason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ReasonInput) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("register_policy_reason", {
      _policy_id: data.policyId,
      _motivo: data.motivo,
      _categoria: data.categoria ?? "",
      _observacoes: data.observacoes ?? "",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Exclusão física se não houver vínculos; caso contrário, inativação lógica. */
export const removeClientSmart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }): Promise<{ result: "deleted" | "deactivated" }> => {
    const { data: result, error } = await context.supabase.rpc("remove_client", { _client_id: data.id });
    if (error) throw new Error(error.message);
    return { result: result as "deleted" | "deactivated" };
  });

export const reactivateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("reactivate_client", { _client_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
