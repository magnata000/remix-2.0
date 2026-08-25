import type { Recurrence } from "./recurrence";

export type { Recurrence };

export type Priority = "alta" | "media" | "baixa";

export type TaskColumn = { id: string; title: string; color: string };

export type TaskComment = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  editedAt?: string;
  editedBy?: string;
  attachmentIds?: string[];
  pinned?: boolean;
};

export const MESSAGE_PREVIEW_LIMIT = 120;
export const MAX_PINNED_COMMENTS = 3;

export type TaskAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
};

export type TaskTimelineEvent =
  | { kind: "created"; at: string; by: string }
  | { kind: "moved"; at: string; by: string; from: string; to: string }
  | { kind: "comment"; at: string; by: string; commentId: string }
  | { kind: "attachment"; at: string; by: string; attachmentId: string };

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  dueDate?: string; // ISO date
  priority: Priority;
  assigneeId: string;
  clientName?: string;
  columnId: string;
  createdAt: string;
  comments: TaskComment[];
  attachments: TaskAttachment[];
  timeline: TaskTimelineEvent[];
  /** Identificador opaco usado por workflows automáticos para dedupe. */
  sourceKey?: string;
  slaDueAt?: string;
  slaHours?: number;
  slaPausedAt?: string;
};

export type ScheduledKind = "data" | "semana" | "recorrente";
export type PeriodKind = "mensal" | "bimestral" | "trimestral" | "semestral" | "anual";

export type ScheduledTask = {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  priority: Priority;
  kind: ScheduledKind;
  /** Data de criação do agendamento — limite inferior para materialização. */
  createdAt?: string;
  startDate?: string;
  endDate?: string;
  /** 0=Dom..6=Sab */
  weekdays?: number[];
  period?: PeriodKind;
  recurrence?: Recurrence;
};

export type NewTaskInput = Omit<
  TaskItem,
  "id" | "createdAt" | "comments" | "attachments" | "timeline"
>;

export type TaskPatch = Partial<
  Pick<
    TaskItem,
    | "title"
    | "description"
    | "dueDate"
    | "priority"
    | "assigneeId"
    | "clientName"
    | "columnId"
    | "slaDueAt"
    | "slaHours"
    | "slaPausedAt"
  >
>;

export type AttachmentInput = {
  name: string;
  size: number;
  type: string;
  storagePath: string;
};

export type BoardData = {
  columns: TaskColumn[];
  tasks: TaskItem[];
  scheduled: ScheduledTask[];
};

export const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-destructive/15 text-destructive" },
  media: { label: "Média", className: "bg-warning/15 text-warning" },
  baixa: { label: "Baixa", className: "bg-info/15 text-info" },
};

export const COLUMN_PALETTE = ["#64748B", "#D97706", "#059669", "#7C3AED", "#DB2777", "#0EA5E9"];
