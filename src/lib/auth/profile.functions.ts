import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "admin" | "pos_venda" | "vendedor";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  pos_venda: "Pós-venda",
  vendedor: "Vendedor",
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  appRole: AppRole;
  isAdmin: boolean;
  canViewAll: boolean;
};


/**
 * Garante que o usuário autenticado possua cadastro em `team_members` e um
 * papel em `user_roles`. O primeiro usuário da corretora vira admin.
 */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Profile> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const claims = context.claims as { email?: string; user_metadata?: { name?: string } };
    const email = claims.email ?? `${userId}@sem-email.local`;
    const name =
      claims.user_metadata?.name?.trim() || email.split("@")[0]?.replace(/[._]/g, " ") || "Usuário";

    const { data: existing } = await supabaseAdmin
      .from("team_members")
      .select("id, name, email, role")
      .eq("id", userId)
      .maybeSingle();

    let member = existing;

    if (!member) {
      const { count } = await supabaseAdmin
        .from("team_members")
        .select("id", { count: "exact", head: true });
      const isFirst = (count ?? 0) === 0;

      const { data: created, error } = await supabaseAdmin
        .from("team_members")
        .upsert(
          { id: userId, name, email, role: isFirst ? "admin" : "vendedor" },
          { onConflict: "id" },
        )
        .select("id, name, email, role")
        .single();
      if (error) throw new Error(error.message);
      member = created;

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: userId, role: isFirst ? "admin" : "vendedor" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (roleError) throw new Error(roleError.message);
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const list = (roles ?? []).map((r) => r.role as AppRole);
    const appRole: AppRole = list.includes("admin")
      ? "admin"
      : list.includes("pos_venda")
        ? "pos_venda"
        : "vendedor";

    return {
      id: member!.id,
      name: member!.name,
      email: member!.email,
      role: member!.role,
      appRole,
      isAdmin: appRole === "admin",
      canViewAll: appRole === "admin" || appRole === "pos_venda",
    };

  });
