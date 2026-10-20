import type { Database } from "@/integrations/supabase/types";

export type PageKey = Database["public"]["Enums"]["page_key"];
export type RoleLabel = Database["public"]["Enums"]["role_label"];
export type UserStatus = Database["public"]["Enums"]["user_status"];
export type PaymentModel = Database["public"]["Enums"]["payment_model"];

/** Ordem de exibição das páginas/sub-áreas controladas por permissão. */
export const PAGE_KEYS: PageKey[] = [
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
  dashboard: "Daily",
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
  if (label === "pos_venda") return ["dashboard", "carteira", "kanban_pipeline", "kanban_tarefas"];
  return ["carteira", "kanban_pipeline", "kanban_tarefas"];
}

/** Ponte com o papel técnico usado pelas regras de visibilidade de dados. */
export function appRoleFor(label: RoleLabel): "admin" | "pos_venda" | "vendedor" {
  return label === "comercial" ? "vendedor" : label;
}
