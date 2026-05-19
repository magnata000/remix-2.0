import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { team } from "@/lib/mock/data";

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
};

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
};

export type ScheduledKind = "data" | "semana" | "periodo";
export type PeriodKind = "mensal" | "bimestral" | "trimestral";

export type ScheduledTask = {
  id: string;
  title: string;
  assigneeId: string;
  priority: Priority;
  kind: ScheduledKind;
  // data (intervalo inicial → final; final = inicial quando único dia)
  startDate?: string;
  endDate?: string;
  yearly?: boolean;
  // semana — 0=Dom..6=Sab
  weekdays?: number[];
  // periodo
  period?: PeriodKind;
};

const SEED_COLUMNS: TaskColumn[] = [
  { id: "c-demanda", title: "Demanda", color: "#64748B" },
  { id: "c-processando", title: "Processando", color: "#D97706" },
  { id: "c-concluido", title: "Concluído", color: "#059669" },
];

const isoDaysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

const me = team[0]?.id ?? "u1";

const seedTasks = (): TaskItem[] => [
  {
    id: "tk1", title: "Renovar apólice Auto — João Silva",
    description: "Apólice vence em breve. Confirmar coberturas e enviar proposta de renovação.",
    dueDate: isoDaysFromNow(2), priority: "alta", assigneeId: team[1]?.id ?? "u2",
    clientName: "João Silva", columnId: "c-demanda",
    createdAt: isoDaysFromNow(-2),
    comments: [
      { id: "cm1", authorId: me, text: "Cliente pediu revisão de franquia. @Carlos Lima pode olhar?", createdAt: isoDaysFromNow(-1) },
    ],
    attachments: [],
    timeline: [
      { kind: "created", at: isoDaysFromNow(-2), by: me },
      { kind: "comment", at: isoDaysFromNow(-1), by: me, commentId: "cm1" },
    ],
  },
  {
    id: "tk2", title: "Coletar documentos PME — Rafael Mendes",
    description: "Solicitar contrato social, último balanço e RG dos sócios.",
    dueDate: isoDaysFromNow(5), priority: "media", assigneeId: me,
    clientName: "Rafael Mendes", columnId: "c-demanda",
    createdAt: isoDaysFromNow(-3),
    comments: [], attachments: [],
    timeline: [{ kind: "created", at: isoDaysFromNow(-3), by: me }],
  },
  {
    id: "tk3", title: "Cotação Residencial — Carlos Lima",
    description: "Realizar multicálculo e levar 3 melhores ofertas ao cliente.",
    dueDate: isoDaysFromNow(3), priority: "alta", assigneeId: team[2]?.id ?? "u3",
    clientName: "Carlos Lima", columnId: "c-processando",
    createdAt: isoDaysFromNow(-4),
    comments: [
      { id: "cm2", authorId: team[2]?.id ?? "u3", text: "Comparativo pronto. Aguardando feedback do @João Pereira sobre comissão.", createdAt: isoDaysFromNow(-1) },
    ],
    attachments: [],
    timeline: [
      { kind: "created", at: isoDaysFromNow(-4), by: me },
      { kind: "moved", at: isoDaysFromNow(-2), by: me, from: "Demanda", to: "Processando" },
      { kind: "comment", at: isoDaysFromNow(-1), by: team[2]?.id ?? "u3", commentId: "cm2" },
    ],
  },
  {
    id: "tk4", title: "Atualizar cadastro — Beatriz Costa",
    description: "Trocar telefone e endereço de cobrança.",
    dueDate: isoDaysFromNow(7), priority: "baixa", assigneeId: me,
    clientName: "Beatriz Costa", columnId: "c-processando",
    createdAt: isoDaysFromNow(-1),
    comments: [], attachments: [],
    timeline: [{ kind: "created", at: isoDaysFromNow(-1), by: me }],
  },
  {
    id: "tk5", title: "Envio de proposta — Mariana Alves",
    description: "Proposta finalizada e enviada por e-mail.",
    dueDate: isoDaysFromNow(-1), priority: "media", assigneeId: team[1]?.id ?? "u2",
    clientName: "Mariana Alves", columnId: "c-concluido",
    createdAt: isoDaysFromNow(-6),
    comments: [], attachments: [],
    timeline: [
      { kind: "created", at: isoDaysFromNow(-6), by: me },
      { kind: "moved", at: isoDaysFromNow(-3), by: me, from: "Demanda", to: "Processando" },
      { kind: "moved", at: isoDaysFromNow(-1), by: me, from: "Processando", to: "Concluído" },
    ],
  },
];

const seedScheduled = (): ScheduledTask[] => [
  {
    id: "sch1", title: "Felicitar aniversariantes do mês",
    assigneeId: team[2]?.id ?? "u3", priority: "baixa",
    kind: "data", startDate: isoDaysFromNow(20), endDate: isoDaysFromNow(20), yearly: true,
  },
];

type Ctx = {
  columns: TaskColumn[];
  tasks: TaskItem[];
  scheduled: ScheduledTask[];
  currentUserId: string;
  addTask: (t: Omit<TaskItem, "id" | "createdAt" | "comments" | "attachments" | "timeline">) => TaskItem;
  moveTask: (id: string, columnId: string) => void;
  addComment: (taskId: string, text: string) => void;
  addMessage: (taskId: string, text: string, files: File[]) => void;
  editComment: (taskId: string, commentId: string, text: string) => void;
  removeCommentAttachment: (taskId: string, commentId: string, attachmentId: string) => void;
  deleteComment: (taskId: string, commentId: string) => void;
  addAttachment: (taskId: string, file: File) => void;
  addColumn: (title: string, color: string) => void;
  renameColumn: (id: string, title: string) => void;
  recolorColumn: (id: string, color: string) => void;
  deleteColumn: (id: string) => void;
  addScheduled: (s: Omit<ScheduledTask, "id">) => void;
  removeScheduled: (id: string) => void;
};

const TaskCtx = createContext<Ctx | null>(null);

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [columns, setColumns] = useState<TaskColumn[]>(SEED_COLUMNS);
  const [tasks, setTasks] = useState<TaskItem[]>(() => seedTasks());
  const [scheduled, setScheduled] = useState<ScheduledTask[]>(() => seedScheduled());
  const currentUserId = me;

  const addTask = useCallback<Ctx["addTask"]>((t) => {
    const id = `tk${Date.now()}`;
    const now = new Date().toISOString();
    const rec: TaskItem = {
      ...t, id, createdAt: now,
      comments: [], attachments: [],
      timeline: [{ kind: "created", at: now, by: currentUserId }],
    };
    setTasks((arr) => [rec, ...arr]);
    return rec;
  }, [currentUserId]);

  const moveTask = useCallback((id: string, columnId: string) => {
    setTasks((arr) => arr.map((t) => {
      if (t.id !== id || t.columnId === columnId) return t;
      const from = columns.find((c) => c.id === t.columnId)?.title ?? "?";
      const to = columns.find((c) => c.id === columnId)?.title ?? "?";
      return {
        ...t, columnId,
        timeline: [...t.timeline, { kind: "moved", at: new Date().toISOString(), by: currentUserId, from, to }],
      };
    }));
  }, [columns, currentUserId]);

  const addComment = useCallback((taskId: string, text: string) => {
    setTasks((arr) => arr.map((t) => {
      if (t.id !== taskId) return t;
      const id = `cm${Date.now()}`;
      const at = new Date().toISOString();
      const comment: TaskComment = { id, authorId: currentUserId, text, createdAt: at };
      return {
        ...t,
        comments: [...t.comments, comment],
        timeline: [...t.timeline, { kind: "comment", at, by: currentUserId, commentId: id }],
      };
    }));
  }, [currentUserId]);

  const editComment = useCallback((taskId: string, commentId: string, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setTasks((arr) => arr.map((t) => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        comments: t.comments.map((c) =>
          c.id === commentId && c.authorId === currentUserId && c.text !== clean
            ? { ...c, text: clean, editedAt: new Date().toISOString(), editedBy: currentUserId }
            : c
        ),
      };
    }));
  }, [currentUserId]);

  const addAttachment = useCallback((taskId: string, file: File) => {
    setTasks((arr) => arr.map((t) => {
      if (t.id !== taskId) return t;
      const id = `at${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const at = new Date().toISOString();
      const att: TaskAttachment = {
        id, name: file.name, size: file.size, type: file.type || "file",
        url: URL.createObjectURL(file), uploadedAt: at,
      };
      return {
        ...t,
        attachments: [...t.attachments, att],
        timeline: [...t.timeline, { kind: "attachment", at, by: currentUserId, attachmentId: id }],
      };
    }));
  }, [currentUserId]);

  const addMessage = useCallback((taskId: string, text: string, files: File[]) => {
    const clean = text.trim();
    if (!clean && files.length === 0) return;
    setTasks((arr) => arr.map((t) => {
      if (t.id !== taskId) return t;
      const at = new Date().toISOString();
      const newAtts: TaskAttachment[] = files.map((f, i) => ({
        id: `at${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        name: f.name, size: f.size, type: f.type || "file",
        url: URL.createObjectURL(f), uploadedAt: at,
      }));
      const commentId = `cm${Date.now()}`;
      const comment: TaskComment = {
        id: commentId, authorId: currentUserId, text: clean, createdAt: at,
        attachmentIds: newAtts.length ? newAtts.map((a) => a.id) : undefined,
      };
      return {
        ...t,
        attachments: [...t.attachments, ...newAtts],
        comments: [...t.comments, comment],
        timeline: [...t.timeline, { kind: "comment", at, by: currentUserId, commentId }],
      };
    }));
  }, [currentUserId]);

  const removeCommentAttachment = useCallback((taskId: string, commentId: string, attachmentId: string) => {
    setTasks((arr) => arr.map((t) => {
      if (t.id !== taskId) return t;
      const c = t.comments.find((x) => x.id === commentId);
      if (!c || c.authorId !== currentUserId) return t;
      return {
        ...t,
        attachments: t.attachments.filter((a) => a.id !== attachmentId),
        comments: t.comments.map((x) =>
          x.id === commentId
            ? { ...x, attachmentIds: (x.attachmentIds ?? []).filter((id) => id !== attachmentId), editedAt: new Date().toISOString(), editedBy: currentUserId }
            : x
        ),
      };
    }));
  }, [currentUserId]);

  const deleteComment = useCallback((taskId: string, commentId: string) => {
    setTasks((arr) => arr.map((t) => {
      if (t.id !== taskId) return t;
      const c = t.comments.find((x) => x.id === commentId);
      if (!c || c.authorId !== currentUserId) return t;
      const attIds = new Set(c.attachmentIds ?? []);
      return {
        ...t,
        comments: t.comments.filter((x) => x.id !== commentId),
        attachments: t.attachments.filter((a) => !attIds.has(a.id)),
        timeline: t.timeline.filter((ev) => !(ev.kind === "comment" && ev.commentId === commentId)),
      };
    }));
  }, [currentUserId]);

  const addColumn = useCallback((title: string, color: string) => {
    setColumns((arr) => [...arr, { id: `c-${Date.now()}`, title: title.trim() || "Nova coluna", color }]);
  }, []);
  const renameColumn = useCallback((id: string, title: string) => {
    setColumns((arr) => arr.map((c) => c.id === id ? { ...c, title } : c));
  }, []);
  const recolorColumn = useCallback((id: string, color: string) => {
    setColumns((arr) => arr.map((c) => c.id === id ? { ...c, color } : c));
  }, []);
  const deleteColumn = useCallback((id: string) => {
    setColumns((arr) => {
      if (arr.length <= 1) return arr;
      const remaining = arr.filter((c) => c.id !== id);
      const fallback = remaining[0].id;
      setTasks((ts) => ts.map((t) => t.columnId === id ? { ...t, columnId: fallback } : t));
      return remaining;
    });
  }, []);

  const addScheduled = useCallback((s: Omit<ScheduledTask, "id">) => {
    setScheduled((arr) => [{ ...s, id: `sch${Date.now()}` }, ...arr]);
  }, []);
  const removeScheduled = useCallback((id: string) => {
    setScheduled((arr) => arr.filter((s) => s.id !== id));
  }, []);

  const value = useMemo<Ctx>(() => ({
    columns, tasks, scheduled, currentUserId,
    addTask, moveTask, addComment, addMessage, editComment, removeCommentAttachment, deleteComment, addAttachment,
    addColumn, renameColumn, recolorColumn, deleteColumn,
    addScheduled, removeScheduled,
  }), [columns, tasks, scheduled, currentUserId, addTask, moveTask, addComment, addMessage, editComment, removeCommentAttachment, deleteComment, addAttachment, addColumn, renameColumn, recolorColumn, deleteColumn, addScheduled, removeScheduled]);

  return <TaskCtx.Provider value={value}>{children}</TaskCtx.Provider>;
}

export function useTaskStore() {
  const c = useContext(TaskCtx);
  if (!c) throw new Error("useTaskStore must be used within TaskStoreProvider");
  return c;
}

export const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-destructive/15 text-destructive" },
  media: { label: "Média", className: "bg-warning/15 text-warning" },
  baixa: { label: "Baixa", className: "bg-info/15 text-info" },
};

export const COLUMN_PALETTE = ["#64748B", "#D97706", "#059669", "#7C3AED", "#DB2777", "#0EA5E9"];
