import type { ModuleKey } from "@/components/shell/TopBar";
import type { PageKey } from "@/lib/settings/permissions";

/** Cada módulo da navegação abre se o usuário tiver ao menos uma das páginas/sub-áreas. */
const MODULE_PAGES: Record<ModuleKey, PageKey[]> = {
  dashboard: ["dashboard"],
  policies: ["carteira"],
  kanban: ["kanban_pipeline", "kanban_tarefas"],
  multicalc: ["kanban_pipeline"],
  financial: ["financeiro_comissoes", "financeiro_despesas", "financeiro_relatorios"],
  settings: ["configuracoes"],
};

const ORDER: ModuleKey[] = ["dashboard", "policies", "kanban", "multicalc", "financial", "settings"];

export function canAccessModule(pages: PageKey[], key: ModuleKey): boolean {
  return MODULE_PAGES[key].some((p) => pages.includes(p));
}

export function visibleModules(pages: PageKey[]): ModuleKey[] {
  return ORDER.filter((k) => canAccessModule(pages, k));
}

/** Primeiro módulo permitido — usado como fallback de navegação. */
export function defaultModule(pages: PageKey[]): ModuleKey {
  return visibleModules(pages)[0] ?? "policies";
}
