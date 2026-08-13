import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AppRole } from "./profile.functions";

export type TeamMemberRow = {
  id: string;
  name: string;
  email: string;
  appRole: AppRole;
};

const APP_ROLES: AppRole[] = ["admin", "pos_venda", "vendedor"];

function pickRole(roles: string[]): AppRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("pos_venda")) return "pos_venda";
  return "vendedor";
}

/** Lista os colaboradores da corretora com o papel real de acesso. */
export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeamMemberRow[]> => {
    const { data: members, error } = await context.supabase
      .from("team_members")
      .select("id, name, email")
      .order("name");
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");

    return (members ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      appRole: pickRole((roles ?? []).filter((r) => r.user_id === m.id).map((r) => r.role)),
    }));
  });

type AuthedSupabase = SupabaseClient<Database>;

async function assertAdmin(supabase: AuthedSupabase, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Apenas administradores podem alterar a equipe.");
}

/** Atualiza dados cadastrais e o papel de acesso de um colaborador (somente admin). */
export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name: string; email: string; appRole: AppRole }) => {
    if (!input.id) throw new Error("Colaborador inválido");
    if (input.name.trim().length < 2) throw new Error("Informe um nome válido");
    if (!/^\S+@\S+\.\S+$/.test(input.email)) throw new Error("Informe um e-mail válido");
    if (!APP_ROLES.includes(input.appRole)) throw new Error("Papel inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("team_members")
      .update({ name: data.name.trim(), email: data.email.trim(), role: data.appRole })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, role: data.appRole });
    if (roleError) throw new Error(roleError.message);

    return { ok: true };
  });

/** Remove um colaborador da corretora (somente admin). */
export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Você não pode remover o próprio acesso.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    const { error } = await supabaseAdmin.from("team_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
