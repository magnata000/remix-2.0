import { useRole } from "@/lib/auth/roleStore";

/**
 * Ponto único de acesso ao usuário logado: retorna o id do usuário
 * autenticado (mesmo id usado em `team_members.assignee_id`).
 */
export function useCurrentUserId(): string {
  return useRole().userId;
}
