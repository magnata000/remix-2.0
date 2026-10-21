import type { Database } from "@/integrations/supabase/types";

export type PageKey = Database["public"]["Enums"]["page_key"];
export type RoleLabel = Database["public"]["Enums"]["role_label"];
export type UserStatus = Database["public"]["Enums"]["user_status"];
export type PaymentModel = Database["public"]["Enums"]["payment_model"];

/** Ordem de exibição das páginas/sub-áreas controladas por permissão. */
export const PAGE_KEYS: PageKey[] = [
  "daily",
  "dashboard",
  "carteira",
  "kanban_pipeline",
  "kanban_tarefas",
  "financeiro_comissoes",
  "financeiro_despesas",
  "financeiro_relatorios",
  "configuracoes",
];

export const PAGE_LABELS: Record<PageKey, string> = {
  daily: "Daily",
  dashboard: "Dashboard",
  carteira: "Carteira",
  kanban_pipeline: "Pipeline de Vendas",
  kanban_tarefas: "Tarefas",
  financeiro_comissoes: "Financeiro · Comissões",
  financeiro_despesas: "Financeiro · Despesas",
  financeiro_relatorios: "Financeiro · Relatórios",
  configuracoes: "Configurações",
};

export const ROLE_LABEL_NAMES: Record<RoleLabel, string> = {
  admin: "Administrador",
  pos_venda: "Pós-venda",
  comercial: "Comercial",
};

export const STATUS_NAMES: Record<UserStatus, string> = {
  convidado: "Convidado",
  ativo: "Ativo",
  bloqueado: "Bloqueado",
};

export const PAYMENT_MODEL_NAMES: Record<PaymentModel, string> = {
  adiantamento: "Adiantamento",
  parcelado: "Parcelado",
  parcela_vitalicio: "Parcela + vitalício",
  parcelado_vitalicio: "Parcelado + vitalício",
};

/** Sugestão inicial de permissões por rótulo; o Admin ajusta usuário a usuário. */
export function defaultPermissions(label: RoleLabel): PageKey[] {
  if (label === "admin") return [...PAGE_KEYS];
  if (label === "pos_venda") return ["daily", "carteira", "kanban_pipeline", "kanban_tarefas"];
  return ["carteira", "kanban_pipeline", "kanban_tarefas"];
}

/** Ponte com o papel técnico usado pelas regras de visibilidade de dados. */
export function appRoleFor(label: RoleLabel): "admin" | "pos_venda" | "vendedor" {
  return label === "comercial" ? "vendedor" : label;
}

export function labelForAppRole(role: string): RoleLabel {
  return role === "vendedor" ? "comercial" : (role as RoleLabel);
}

const ROLE_RANK: RoleLabel[] = ["admin", "pos_venda", "comercial"];

/** Papel principal = o mais amplo entre os atribuídos (admin > pós-venda > comercial). */
export function primaryLabel(labels: RoleLabel[]): RoleLabel {
  return ROLE_RANK.find((r) => labels.includes(r)) ?? "comercial";
}

/** Normaliza a lista de papéis: sem duplicados, ordenada do mais amplo, pelo menos um. */
export function normalizeLabels(labels: RoleLabel[]): RoleLabel[] {
  if (!Array.isArray(labels) || labels.some((l) => !ROLE_RANK.includes(l)))
    throw new Error("Role inválida");
  const out = ROLE_RANK.filter((r) => labels.includes(r));
  if (out.length === 0) throw new Error("Selecione pelo menos uma role");
  return out;
}

/** O admin nunca pode tirar de si o papel de Administrador. */
export function assertSelfKeepsAdmin(isSelf: boolean, labels: RoleLabel[]) {
  if (isSelf && !labels.includes("admin"))
    throw new Error("Você não pode remover o próprio papel de Administrador.");
}
