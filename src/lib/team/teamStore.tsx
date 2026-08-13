/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { buildTeamNameIndex, type TeamNameIndex } from "@/lib/daily/mentions";
import { ROLE_LABELS, type AppRole } from "@/lib/auth/profile.functions";
import { listTeam, removeTeamMember, updateTeamMember } from "@/lib/auth/team.functions";
import { useAuth } from "@/hooks/useAuth";

export type TeamRole = AppRole;
export const TEAM_ROLES: TeamRole[] = ["admin", "pos_venda", "vendedor"];
export const roleLabel = (role: TeamRole) => ROLE_LABELS[role];

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

type TeamCtx = {
  members: Member[];
  loading: boolean;
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

/**
 * Espelho síncrono da equipe carregada, para helpers puros que rodam fora do
 * React (ex.: `initialsOf`/`nameOf`, parsing de menções).
 */
let registry: Member[] = [];
export function getTeamMembers(): Member[] {
  return registry;
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const fetchTeam = useServerFn(listTeam);
  const updateFn = useServerFn(updateTeamMember);
  const removeFn = useServerFn(removeTeamMember);

  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => fetchTeam(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  /** Convites ainda não aceitos vivem apenas na sessão (não há tabela de convites). */
  const [pending, setPending] = useState<Member[]>([]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["team"] });
  }, [queryClient]);

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; name: string; email: string; appRole: AppRole }) =>
      updateFn({ data: input }),
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: invalidate,
  });

  const persisted: Member[] = useMemo(
    () =>
      (data ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.appRole,
        status: "active" as const,
      })),
    [data],
  );

  const members = useMemo(() => [...persisted, ...pending], [persisted, pending]);
  registry = members;

  const updateMember: TeamCtx["updateMember"] = useCallback(
    (id, patch) => {
      const target = members.find((m) => m.id === id);
      if (!target) return;
      if (target.status === "pending") {
        setPending((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
        return;
      }
      updateMutation.mutate({
        id,
        name: patch.name ?? target.name,
        email: patch.email ?? target.email,
        appRole: patch.role ?? target.role,
      });
    },
    [members, updateMutation],
  );

  const removeMember: TeamCtx["removeMember"] = useCallback(
    (id) => {
      const target = members.find((m) => m.id === id);
      if (!target) return;
      if (target.status === "pending") {
        setPending((prev) => prev.filter((m) => m.id !== id));
        return;
      }
      removeMutation.mutate(id);
    },
    [members, removeMutation],
  );

  const addMember: TeamCtx["addMember"] = useCallback((input) => {
    const member: Member = {
      id: `invite-${Date.now()}`,
      name: input.name,
      email: input.email,
      role: input.role,
      status: input.status ?? "pending",
      inviteToken: Math.random().toString(36).slice(2, 10),
      invitedAt: new Date().toISOString(),
    };
    setPending((prev) => [...prev, member]);
    return member;
  }, []);

  const resendInvite: TeamCtx["resendInvite"] = useCallback((id) => {
    let updated: Member | undefined;
    setPending((prev) =>
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
    <Ctx.Provider
      value={{
        members,
        loading: isLoading,
        updateMember,
        removeMember,
        addMember,
        resendInvite,
      }}
    >
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
 * utilitários). Sem provider disponível, devolve índice vazio.
 */
export function getTeamNameIndex(): TeamNameIndex {
  return buildTeamNameIndex(registry);
}

export function buildInviteLink(token: string) {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}
