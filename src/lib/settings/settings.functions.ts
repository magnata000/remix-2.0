import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  PAGE_KEYS,
  appRoleFor,
  assertSelfKeepsAdmin,
  defaultPermissions,
  labelForAppRole,
  normalizeLabels,
  primaryLabel,
  type PageKey,
  type PaymentModel,
  type RoleLabel,
  type UserStatus,
} from "./permissions";

type Db = SupabaseClient<Database>;

async function assertAdmin(supabase: Db, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Apenas administradores podem acessar Configurações.");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Grava o acesso de cada página e sincroniza os papéis técnicos (uma linha por papel). */
async function writeAccess(db: Db, userId: string, labels: RoleLabel[], pages: PageKey[]) {
  const rows = PAGE_KEYS.map((page_key) => ({
    user_id: userId,
    page_key,
    can_access: pages.includes(page_key),
  }));
  const { error } = await db.from("user_permissions").upsert(rows, { onConflict: "user_id,page_key" });
  if (error) throw new Error(error.message);
  await db.from("user_roles").delete().eq("user_id", userId);
  const { error: roleError } = await db
    .from("user_roles")
    .insert(labels.map((l) => ({ user_id: userId, role: appRoleFor(l) })));
  if (roleError) throw new Error(roleError.message);
}

export type SettingsUser = {
  id: string;
  name: string;
  email: string;
  roleLabel: RoleLabel;
  roleLabels: RoleLabel[];
  status: UserStatus;
  canViewAllOpportunities: boolean;
  pages: PageKey[];
  createdAt: string;
};

export const listSettingsUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SettingsUser[]> => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const [{ data: members, error }, { data: perms }, { data: roles }] = await Promise.all([
      context.supabase
        .from("team_members")
        .select("id, name, email, role_label, status, can_view_all_opportunities, created_at")
        .order("name"),
      context.supabase.from("user_permissions").select("user_id, page_key, can_access"),
      db.from("user_roles").select("user_id, role"),
    ]);
    if (error) throw new Error(error.message);
    return (members ?? []).map((m) => {
      const own = (roles ?? []).filter((r) => r.user_id === m.id).map((r) => labelForAppRole(r.role));
      const roleLabels = own.length ? normalizeLabels(own) : [m.role_label];
      return {
        id: m.id,
        name: m.name,
        email: m.email,
        roleLabel: primaryLabel(roleLabels),
        roleLabels,
        status: m.status,
        canViewAllOpportunities: m.can_view_all_opportunities,
        createdAt: m.created_at,
        pages: (perms ?? []).filter((p) => p.user_id === m.id && p.can_access).map((p) => p.page_key),
      };
    });
  });

type UserInput = {
  id: string;
  name: string;
  roleLabels: RoleLabel[];
  pages: PageKey[];
  canViewAllOpportunities: boolean;
};

function validateUser<T extends Omit<UserInput, "id">>(d: T): T {
  if (d.name.trim().length < 2) throw new Error("Informe um nome válido");
  const roleLabels = normalizeLabels(d.roleLabels);
  if (!Array.isArray(d.pages) || d.pages.some((p) => !PAGE_KEYS.includes(p)))
    throw new Error("Permissões inválidas");
  return { ...d, roleLabels };
}

export const updateSettingsUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: UserInput) => validateUser(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const isSelf = data.id === context.userId;
    assertSelfKeepsAdmin(isSelf, data.roleLabels);
    if (isSelf && !data.pages.includes("configuracoes"))
      throw new Error("Você não pode remover o próprio acesso administrativo.");
    const main = primaryLabel(data.roleLabels);
    const db = await admin();
    const { error } = await db
      .from("team_members")
      .update({
        name: data.name.trim(),
        role_label: main,
        role: appRoleFor(main),
        can_view_all_opportunities: main === "comercial" && data.canViewAllOpportunities,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAccess(db, data.id, data.roleLabels, data.pages);
    return { ok: true };
  });

/** Bloqueio é reversível e preserva todo o histórico do usuário (sem exclusão física). */
export const setSettingsUserBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; blocked: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Você não pode bloquear o próprio acesso.");
    const db = await admin();
    const { data: current } = await db.from("team_members").select("status").eq("id", data.id).single();
    const next: UserStatus = data.blocked ? "bloqueado" : current?.status === "convidado" ? "convidado" : "ativo";
    const { error } = await db.from("team_members").update({ status: next }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await db.auth.admin.updateUserById(data.id, { ban_duration: data.blocked ? "876000h" : "none" });
    return { ok: true };
  });

/**
 * Exclusão definitiva: a RPC delete_team_member valida as regras e transfere os registros
 * para o admin executor; em seguida a conta de login é apagada (sem acesso futuro).
 */
export const deleteSettingsUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d.id) throw new Error("Usuário inválido");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Você não pode excluir o próprio usuário.");
    const { error } = await context.supabase.rpc("delete_team_member", { _user_id: data.id });
    if (error) throw new Error(error.message);
    const db = await admin();
    const { error: authError } = await db.auth.admin.deleteUser(data.id);
    if (authError && !/not found/i.test(authError.message)) throw new Error(authError.message);
    return { ok: true };
  });

/** Pré-cadastro + convite por e-mail. O usuário só entra pelo link do convite. */
export const inviteSettingsUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Omit<UserInput, "id"> & { email: string; redirectTo: string }) => {
    if (!/^\S+@\S+\.\S+$/.test(d.email)) throw new Error("Informe um e-mail válido");
    return validateUser(d);
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const email = data.email.trim().toLowerCase();
    const { data: exists } = await db.from("team_members").select("id").ilike("email", email).maybeSingle();
    if (exists) throw new Error("Já existe um usuário com este e-mail.");
    const { data: invited, error } = await db.auth.admin.inviteUserByEmail(email, {
      redirectTo: data.redirectTo,
      data: { name: data.name.trim() },
    });
    if (error || !invited.user) throw new Error(error?.message ?? "Não foi possível enviar o convite.");
    const id = invited.user.id;
    const { error: memberError } = await db.from("team_members").insert({
      id,
      name: data.name.trim(),
      email,
      role: appRoleFor(data.roleLabel),
      role_label: data.roleLabel,
      status: "convidado",
      can_view_all_opportunities: data.canViewAllOpportunities,
    });
    if (memberError) throw new Error(memberError.message);
    await writeAccess(db, id, data.roleLabel, data.pages);
    return { ok: true };
  });

export const resendSettingsInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; redirectTo: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: m } = await db.from("team_members").select("email, name, status").eq("id", data.id).single();
    if (!m || m.status !== "convidado") throw new Error("Este usuário já aceitou o convite.");
    const { error } = await db.auth.admin.inviteUserByEmail(m.email, {
      redirectTo: data.redirectTo,
      data: { name: m.name },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Solicitações de acesso ----------------

export type AccessRequestRow = { id: string; name: string; email: string; status: string; createdAt: string };

export const listAccessRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccessRequestRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("access_requests")
      .select("id, name, email, status, created_at")
      .eq("status", "pendente")
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({ id: r.id, name: r.name, email: r.email, status: r.status, createdAt: r.created_at }));
  });

export const resolveAccessRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { id: string; approve: boolean; roleLabel?: RoleLabel; pages?: PageKey[] }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: req } = await db.from("access_requests").select("*").eq("id", data.id).single();
    if (!req || req.status !== "pendente") throw new Error("Solicitação já resolvida.");
    if (data.approve) {
      if (!req.user_id) throw new Error("Solicitação sem conta vinculada.");
      const label = data.roleLabel ?? "comercial";
      const { error } = await db.from("team_members").upsert(
        { id: req.user_id, name: req.name, email: req.email, role: appRoleFor(label), role_label: label, status: "ativo" },
        { onConflict: "id" },
      );
      if (error) throw new Error(error.message);
      await writeAccess(db, req.user_id, label, data.pages ?? defaultPermissions(label));
    }
    const { error } = await db
      .from("access_requests")
      .update({
        status: data.approve ? "aprovado" : "recusado",
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Catálogos (ramos e seguradoras) ----------------

export const renameCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "branch" | "insurer"; id: string; name: string }) => {
    if (d.name.trim().length < 2) throw new Error("Informe um nome válido");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const table = data.kind === "branch" ? "branches" : "insurers";
    const { error } = await context.supabase.from(table).update({ name: data.name.trim() }).eq("id", data.id);
    if (error) throw new Error(error.code === "23505" ? "Já existe um cadastro com esse nome." : error.message);
    return { ok: true };
  });

// ---------------- Modelos de comissionamento ----------------

export type CommissionModel = {
  id: string;
  insurerId: string;
  branchId: string;
  modeloPagamento: PaymentModel;
  percentualPadrao: number;
};

/** Leitura liberada à equipe: os formulários de apólice carregam o modelo como ponto de partida. */
export const listCommissionModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CommissionModel[]> => {
    const { data, error } = await context.supabase
      .from("commission_config")
      .select("id, insurer_id, branch_id, modelo_pagamento, percentual_padrao");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      insurerId: r.insurer_id,
      branchId: r.branch_id,
      modeloPagamento: r.modelo_pagamento,
      percentualPadrao: Number(r.percentual_padrao),
    }));
  });

export const upsertCommissionModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Omit<CommissionModel, "id">) => {
    if (!d.insurerId || !d.branchId) throw new Error("Selecione seguradora e ramo");
    if (!(d.percentualPadrao >= 0 && d.percentualPadrao <= 100)) throw new Error("Percentual entre 0 e 100");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("commission_config").upsert(
      {
        insurer_id: data.insurerId,
        branch_id: data.branchId,
        modelo_pagamento: data.modeloPagamento,
        percentual_padrao: data.percentualPadrao,
      },
      { onConflict: "insurer_id,branch_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCommissionModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("commission_config").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Notificações ----------------

export type NotificationRow = {
  id: string;
  type: Database["public"]["Enums"]["notification_type"];
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isActionable: boolean;
  resolvedAt: string | null;
  readAt: string | null;
  createdAt: string;
};

const RETENTION_DAYS = 15;

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationRow[]> => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const cutoff = Date.now() - RETENTION_DAYS * 86_400_000;
    return (data ?? [])
      .filter((n) => {
        const pending = n.is_actionable ? !n.resolved_at : !n.read_at;
        if (pending) return true; // acionáveis pendentes nunca expiram
        const doneAt = n.is_actionable ? n.resolved_at : n.read_at;
        return doneAt ? new Date(doneAt).getTime() >= cutoff : false;
      })
      .map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        relatedEntityType: n.related_entity_type,
        relatedEntityId: n.related_entity_id,
        isActionable: n.is_actionable,
        resolvedAt: n.resolved_at,
        readAt: n.read_at,
        createdAt: n.created_at,
      }));
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data, context }) => {
    if (data.ids.length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", data.ids)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
