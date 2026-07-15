import { team } from "@/lib/mock/data";

/**
 * Ponto único de acesso ao usuário logado.
 * Hoje: retorna o `me` do mock (team[0]).
 * Quando o login real for implementado, esta função passa a ler
 * a sessão de autenticação e todo o app segue funcionando.
 */
export function useCurrentUserId(): string {
  return team[0]?.id ?? "u1";
}
