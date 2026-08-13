import type { AppRole } from "./profile.functions";
import type { ModuleKey } from "@/components/shell/TopBar";

const ACCESS: Record<AppRole, ModuleKey[]> = {
  admin: ["dashboard", "policies", "kanban", "multicalc", "financial", "settings"],
  pos_venda: ["dashboard", "policies", "kanban", "multicalc"],
  vendedor: ["policies", "kanban", "multicalc"],
};

export function visibleModules(role: AppRole): ModuleKey[] {
  return ACCESS[role];
}

export function canAccessModule(role: AppRole, key: ModuleKey): boolean {
  return ACCESS[role].includes(key);
}

/** Primeiro módulo permitido — usado como fallback de navegação. */
export function defaultModule(role: AppRole): ModuleKey {
  return ACCESS[role][0] ?? "policies";
}
