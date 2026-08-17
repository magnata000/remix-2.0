import type { Branch, KanbanStage, LostReason } from "@/lib/mock/data";
import type { TaskAttachment, TaskComment, TaskTimelineEvent } from "@/lib/tasks/types";

export type StageHistoryEntry = { stage: KanbanStage; enteredAt: string; exitedAt?: string };

export type Opportunity = {
  id: string;
  title: string;
  clientName: string;
  clientId?: string;
  branch: Branch;
  estimatedValue: number;
  dueDate: string;
  /** Iniciais do responsável (derivadas do nome em team_members). */
  assignee: string;
  assigneeId: string;
  stage: KanbanStage;
  quoteGroupId?: string;
  lostReason?: LostReason;
  lostNote?: string;
  createdAt: string;
  closedAt?: string;
  comments: TaskComment[];
  attachments: TaskAttachment[];
  timeline: TaskTimelineEvent[];
  stageHistory: StageHistoryEntry[];
  slaDueAt?: string;
  slaHours?: number;
  slaPausedAt?: string;
};

export type NewOpportunityInput = {
  title: string;
  clientName: string;
  clientId?: string;
  branch: Branch;
  estimatedValue: number;
  dueDate: string;
  assigneeId: string;
  stage: KanbanStage;
  quoteGroupId?: string;
};

export type OpportunityPatch = Partial<{
  title: string;
  clientName: string;
  clientId: string | null;
  branch: Branch;
  estimatedValue: number;
  dueDate: string;
  assigneeId: string;
  quoteGroupId: string | null;
  slaDueAt: string | undefined;
  slaHours: number | undefined;
  slaPausedAt: string | undefined;
}>;

export type OpportunityAttachmentInput = {
  name: string;
  size: number;
  type: string;
  storagePath: string;
};

export const OPPORTUNITY_BUCKET = "opportunity-attachments";

export const stageLabels: Record<KanbanStage, string> = {
  lead: "Lead",
  cotacao: "Cotação",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};
