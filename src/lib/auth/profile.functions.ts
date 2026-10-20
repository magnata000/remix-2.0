import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAGE_KEYS, appRoleFor, type PageKey, type RoleLabel } from "@/lib/settings/permissions";

export type AppRole = "admin" | "pos_venda" | "vendedor";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  pos_venda: "Pós-venda",
  vendedor: "Comercial",
};

/** ok = acesso liberado; pendente = aguardando autorização do Admin; bloqueado = acesso suspenso. */
export type AccessStatus = "ok" | "pendente" | "bloqueado";

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  appRole: AppRole;
  isAdmin: boolean;
  canViewAll: boolean;
  accessStatus: AccessStatus;
  pages: PageKey[];
  canViewAllOpportunities: boolean;
};

/**
 * Resolve o acesso do usuário autenticado. O primeiro usuário da corretora vira admin;
 * os demais só entram por convite ou após o Admin aprovar a solicitação de acesso.
 */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Profile> => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const claims = context.claims as { email?: string; user_metadata?: { name?: string } };
    const email = claims.email ?? `${userId}@sem-email.local`;
    const name =
      claims.user_metadata?.name?.trim() || email.split("@")[0]?.replace(/[._]/g, " ") || "Usuário";

    let { data: member } = await db
      .from("team_members")
      .select("id, name, email, role, role_label, status, can_view_all_opportunities")
      .eq("id", userId)
      .maybeSingle();

    const blank = (accessStatus: AccessStatus): Profile => ({
      id: userId,
      name,
      email,
      role: "",
      appRole: "vendedor",
      isAdmin: false,
      canViewAll: false,
      accessStatus,
      pages: [],
      canViewAllOpportunities: false,
    });

    if (!member) {
      const { count } = await db.from("team_members").select("id", { count: "exact", head: true });
      if ((count ?? 0) > 0) {
        await db
          .from("access_requests")
          .upsert({ user_id: userId, name, email }, { onConflict: "user_id", ignoreDuplicates: true });
        return blank("pendente");
      }
      const label: RoleLabel = "admin";
      const { data: created, error } = await db
        .from("team_members")
        .insert({ id: userId, name, email, role: "admin", role_label: label, status: "ativo" })
        .select("id, name, email, role, role_label, status, can_view_all_opportunities")
        .single();
      if (error) throw new Error(error.message);
      member = created;
      await db.from("user_roles").insert({ user_id: userId, role: appRoleFor(label) });
      await db
        .from("user_permissions")
        .upsert(PAGE_KEYS.map((page_key) => ({ user_id: userId, page_key, can_access: true })), {
          onConflict: "user_id,page_key",
        });
    }

    if (member.status === "bloqueado") return blank("bloqueado");
    if (member.status === "convidado") {
      await db.from("team_members").update({ status: "ativo" }).eq("id", userId);
    }

    const [{ data: roles }, { data: perms }] = await Promise.all([
      db.from("user_roles").select("role").eq("user_id", userId),
      db.from("user_permissions").select("page_key").eq("user_id", userId).eq("can_access", true),
    ]);
    const list = (roles ?? []).map((r) => r.role as AppRole);
    const appRole: AppRole = list.includes("admin")
      ? "admin"
      : list.includes("pos_venda")
        ? "pos_venda"
        : "vendedor";

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role_label,
      appRole,
      isAdmin: appRole === "admin",
      canViewAll: appRole === "admin" || appRole === "pos_venda",
      accessStatus: "ok",
      pages: (perms ?? []).map((p) => p.page_key),
      canViewAllOpportunities:
        appRole !== "vendedor" || member.can_view_all_opportunities,
    };
  });
