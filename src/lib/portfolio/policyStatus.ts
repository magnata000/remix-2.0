import type { PolicyStatus } from "@/lib/mock/data";

/** Fonte única de rótulo/cor dos status de apólice (spec Carteira §3.2.6). */
export const POLICY_STATUS_META: Record<PolicyStatus, { label: string; className: string }> = {
  ativa: { label: "Ativa", className: "bg-success/15 text-success border-0" },
  a_vencer: { label: "A vencer", className: "bg-warning/15 text-warning border-0" },
  vencida: { label: "Vencida", className: "bg-destructive/15 text-destructive border-0" },
  renovada: { label: "Renovada", className: "bg-info/15 text-info border-0" },
  nao_renovada: { label: "Não renovada", className: "bg-muted/60 text-muted-foreground border-0" },
  cancelada: { label: "Cancelada", className: "bg-muted-foreground/20 text-foreground border-0" },
  pendente: { label: "Ativa", className: "bg-success/15 text-success border-0" },
};

/** Status visíveis no filtro (pendente é legado). */
export const POLICY_STATUS_FILTER: PolicyStatus[] = [
  "ativa",
  "a_vencer",
  "vencida",
  "nao_renovada",
  "renovada",
  "cancelada",
];

/** renovada/cancelada só mudam por ação manual e são definitivos. */
export const isTerminalStatus = (s: PolicyStatus) => s === "renovada" || s === "cancelada";

export const REASON_OPTIONS = [
  { value: "preco", label: "Preço" },
  { value: "relacionamento", label: "Relacionamento" },
  { value: "concorrencia", label: "Concorrência" },
  { value: "experiencia", label: "Experiência" },
  { value: "outro", label: "Outro" },
] as const;
