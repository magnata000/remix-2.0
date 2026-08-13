/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ensureProfile, type AppRole, type Profile } from "./profile.functions";

type RoleCtx = {
  profile: Profile | null;
  userId: string;
  appRole: AppRole;
  isAdmin: boolean;
  /** admin ou pós-venda: enxerga registros de toda a corretora */
  canViewAll: boolean;
  loading: boolean;
};

const Ctx = createContext<RoleCtx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const bootstrap = useServerFn(ensureProfile);
  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => bootstrap(),
    staleTime: 60_000,
  });

  const profile = data ?? null;
  const appRole: AppRole = profile?.appRole ?? "vendedor";

  return (
    <Ctx.Provider
      value={{
        profile,
        userId: profile?.id ?? "",
        appRole,
        isAdmin: appRole === "admin",
        canViewAll: appRole === "admin" || appRole === "pos_venda",
        loading: isLoading,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useRole(): RoleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
