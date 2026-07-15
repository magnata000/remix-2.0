import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from "react";
import { team as seedTeam } from "@/lib/mock/data";
import { buildTeamNameIndex, type TeamNameIndex } from "@/lib/daily/mentions";

export type TeamRole = "Administrador" | "Pós-venda" | "Vendedor";
export const TEAM_ROLES: TeamRole[] = ["Administrador", "Pós-venda", "Vendedor"];

export type MemberStatus = "active" | "pending";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: MemberStatus;
  inviteToken?: string;
  invitedAt?: string;
};

// Map seed roles to the new enum
const mapSeedRole = (role: string): TeamRole => {
  const r = role.toLowerCase();
  if (r.includes("sóci") || r.includes("financ")) return "Administrador";
  if (r.includes("atend") || r.includes("pós")) return "Pós-venda";
  return "Vendedor";
};

const initialMembers: Member[] = seedTeam.map((m) => ({
  id: m.id,
  name: m.name,
  email: m.email,
  role: mapSeedRole(m.role),
  status: "active" as const,
}));

type TeamCtx = {
  members: Member[];
  updateMember: (id: string, patch: Partial<Omit<Member, "id">>) => void;
  removeMember: (id: string) => void;
  addMember: (input: {
    name: string;
    email: string;
    role: TeamRole;
    status?: MemberStatus;
  }) => Member;
  resendInvite: (id: string) => Member | undefined;
};

const Ctx = createContext<TeamCtx | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(initialMembers);

  const updateMember: TeamCtx["updateMember"] = useCallback((id, patch) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const removeMember: TeamCtx["removeMember"] = useCallback((id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addMember: TeamCtx["addMember"] = useCallback((input) => {
    const member: Member = {
      id: `u${Date.now()}`,
      name: input.name,
      email: input.email,
      role: input.role,
      status: input.status ?? "pending",
      inviteToken: input.status === "active" ? undefined : Math.random().toString(36).slice(2, 10),
      invitedAt: new Date().toISOString(),
    };
    setMembers((prev) => [...prev, member]);
    return member;
  }, []);

  const resendInvite: TeamCtx["resendInvite"] = useCallback((id) => {
    let updated: Member | undefined;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        updated = {
          ...m,
          inviteToken: Math.random().toString(36).slice(2, 10),
          invitedAt: new Date().toISOString(),
        };
        return updated;
      }),
    );
    return updated;
  }, []);

  return (
    <Ctx.Provider value={{ members, updateMember, removeMember, addMember, resendInvite }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTeam() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTeam must be used inside TeamProvider");
  return ctx;
}

/**
 * Hook reativo: retorna um índice `lowercase name → id` derivado do estado
 * atual do provider. Ideal para código React.
 */
export function useTeamNameIndex(): TeamNameIndex {
  const { members } = useTeam();
  return useMemo(() => buildTeamNameIndex(members), [members]);
}

/**
 * Helper síncrono, consumível fora de componentes React (funções puras,
 * utilitários). Cacheado por módulo — hoje reflete apenas o seed mock;
 * quando a fonte for real, este helper vira o ponto único de swap.
 */
let cachedIndex: TeamNameIndex | null = null;
export function getTeamNameIndex(): TeamNameIndex {
  if (!cachedIndex) cachedIndex = buildTeamNameIndex(initialMembers);
  return cachedIndex;
}

export function buildInviteLink(token: string) {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}
