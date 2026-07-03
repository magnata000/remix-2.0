import { createContext, useContext, useState, useCallback, useMemo, ReactNode, createElement } from "react";
import { tasks as initialTasks, team, type Task, type KanbanStage, type LostReason, type Branch } from "@/lib/mock/data";
import { MAX_PINNED_COMMENTS, type TaskAttachment, type TaskComment, type TaskTimelineEvent } from "@/lib/tasks/taskStore";

export type StageHistoryEntry = { stage: KanbanStage; enteredAt: string; exitedAt?: string };

export type Opportunity = Task & {
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

type Ctx = {
  opportunities: Opportunity[];
  currentUserId: string;
  byQuoteGroup: (groupId: string) => Opportunity | undefined;
  moveStage: (id: string, stage: KanbanStage, lostReason?: LostReason, lostNote?: string) => void;
  linkQuoteGroup: (opportunityId: string, quoteGroupId: string) => void;
  createFromQuote: (input: { clientName: string; branch: Branch; estimatedValue: number; quoteGroupId: string }) => Opportunity;
  createOpportunity: (input: { title: string; clientName: string; branch: Branch; estimatedValue: number; dueDate: string; assignee: string; stage: KanbanStage }) => Opportunity;
  setEstimatedValue: (id: string, value: number) => void;
  updateOpportunity: (id: string, patch: Partial<Pick<Opportunity, "title" | "estimatedValue" | "dueDate" | "assignee" | "clientName" | "branch" | "slaDueAt" | "slaHours">>) => void;
  deleteOpportunity: (id: string) => void;
  unlinkQuoteGroup: (quoteGroupId: string) => void;
  addMessage: (id: string, text: string, files: File[]) => void;
  addAudioMessage: (id: string, blob: Blob, durationSec: number) => void;
  editComment: (id: string, commentId: string, text: string) => void;
  deleteComment: (id: string, commentId: string) => void;
  removeCommentAttachment: (id: string, commentId: string, attachmentId: string) => void;
  addAttachment: (id: string, file: File) => void;
  togglePinComment: (id: string, commentId: string) => void;
};

const PipelineContext = createContext<Ctx | null>(null);

const me = team[0]?.id ?? "u1";

export const stageLabels: Record<KanbanStage, string> = {
  lead: "Lead",
  cotacao: "Cotação",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

const STAGE_ORDER: KanbanStage[] = ["lead", "cotacao", "negociacao", "fechado", "perdido"];

/** Constrói stageHistory sintético para o seed:
 * distribui tempo entre createdAt e agora (ou closedAt) através de todos os estágios anteriores + atual.
 */
function buildSyntheticStageHistory(current: KanbanStage, createdAt: string, closedAt?: string): StageHistoryEntry[] {
  const start = new Date(createdAt).getTime();
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0) return [{ stage: current, enteredAt: createdAt }];
  const path: KanbanStage[] = [];
  if (current === "perdido") {
    // Passou por lead → cotacao (talvez negociacao) → perdido
    const upto = Math.min(2, idx);
    for (let i = 0; i <= upto; i++) path.push(STAGE_ORDER[i]);
    path.push("perdido");
  } else {
    for (let i = 0; i <= idx; i++) path.push(STAGE_ORDER[i]);
  }
  const total = Math.max(1, end - start);
  const segs = path.length;
  const step = total / segs;
  const history: StageHistoryEntry[] = [];
  for (let i = 0; i < path.length; i++) {
    const enteredAt = new Date(start + i * step).toISOString();
    if (i === path.length - 1) {
      history.push({ stage: path[i], enteredAt });
    } else {
      const exitedAt = new Date(start + (i + 1) * step).toISOString();
      history.push({ stage: path[i], enteredAt, exitedAt });
    }
  }
  return history;
}

function withDefaults(t: Task, daysAgo = 5): Opportunity {
  const created = new Date();
  created.setDate(created.getDate() - daysAgo);
  const at = created.toISOString();
  let closedAt: string | undefined;
  if (t.stage === "fechado") {
    const seed = (t.id.charCodeAt(t.id.length - 1) ?? 0) + t.estimatedValue;
    const monthsAgo = seed % 12;
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    d.setDate(1 + (seed % 27));
    closedAt = d.toISOString();
  } else if (t.stage === "perdido") {
    const d = new Date();
    d.setDate(d.getDate() - (daysAgo - 1));
    closedAt = d.toISOString();
  }
  return {
    ...t,
    createdAt: at,
    closedAt,
    comments: [],
    attachments: [],
    timeline: [{ kind: "created", at, by: me }],
    stageHistory: buildSyntheticStageHistory(t.stage, at, closedAt),
  };
}

export function PipelineStoreProvider({ children }: { children: ReactNode }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() =>
    initialTasks.map((t, i) => withDefaults(t, 2 + (i % 10))),
  );

  const moveStage = useCallback((id: string, stage: KanbanStage, lostReason?: LostReason, lostNote?: string) => {
    setOpportunities((arr) => arr.map((t) => {
      if (t.id !== id) return t;
      if (t.stage === stage) {
        return {
          ...t,
          lostReason: stage === "perdido" ? (lostReason ?? t.lostReason) : undefined,
          lostNote: stage === "perdido" ? (lostNote ?? t.lostNote) : undefined,
        };
      }
      const from = stageLabels[t.stage];
      const to = stageLabels[stage];
      const nowIso = new Date().toISOString();
      const history = [...t.stageHistory];
      const last = history[history.length - 1];
      if (last && !last.exitedAt) last.exitedAt = nowIso;
      history.push({ stage, enteredAt: nowIso });
      const terminal = stage === "fechado" || stage === "perdido";
      return {
        ...t,
        stage,
        closedAt: terminal ? nowIso : t.closedAt,
        lostReason: stage === "perdido" ? (lostReason ?? t.lostReason) : undefined,
        lostNote: stage === "perdido" ? (lostNote ?? t.lostNote) : undefined,
        timeline: [...t.timeline, { kind: "moved", at: nowIso, by: me, from, to }],
        stageHistory: history,
        slaPausedAt: terminal ? nowIso : undefined,
      };
    }));
  }, []);

  const linkQuoteGroup = useCallback((opportunityId: string, quoteGroupId: string) => {
    setOpportunities((arr) => arr.map((t) => t.id === opportunityId ? { ...t, quoteGroupId } : t));
  }, []);

  const createFromQuote = useCallback((input: { clientName: string; branch: Branch; estimatedValue: number; quoteGroupId: string }) => {
    const id = `t${Date.now()}`;
    const due = new Date();
    due.setDate(due.getDate() + 7);
    const at = new Date().toISOString();
    const opp: Opportunity = {
      id,
      title: `Cotação ${input.branch} — ${input.clientName}`,
      clientName: input.clientName,
      branch: input.branch,
      estimatedValue: input.estimatedValue,
      dueDate: due.toISOString().slice(0, 10),
      assignee: "AS",
      stage: "cotacao",
      quoteGroupId: input.quoteGroupId,
      createdAt: at,
      comments: [],
      attachments: [],
      timeline: [{ kind: "created", at, by: me }],
      stageHistory: [{ stage: "cotacao", enteredAt: at }],
    };
    setOpportunities((arr) => [opp, ...arr]);
    return opp;
  }, []);

  const createOpportunity = useCallback((input: { title: string; clientName: string; branch: Branch; estimatedValue: number; dueDate: string; assignee: string; stage: KanbanStage }) => {
    const at = new Date().toISOString();
    const opp: Opportunity = {
      id: `t${Date.now()}`,
      ...input,
      createdAt: at,
      comments: [],
      attachments: [],
      timeline: [{ kind: "created", at, by: me }],
      stageHistory: [{ stage: input.stage, enteredAt: at }],
    };
    setOpportunities((arr) => [opp, ...arr]);
    return opp;
  }, []);

  const setEstimatedValue = useCallback((id: string, value: number) => {
    setOpportunities((arr) => arr.map((t) => t.id === id ? { ...t, estimatedValue: value } : t));
  }, []);

  const updateOpportunity = useCallback<Ctx["updateOpportunity"]>((id, patch) => {
    setOpportunities((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteOpportunity = useCallback((id: string) => {
    setOpportunities((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const unlinkQuoteGroup = useCallback((quoteGroupId: string) => {
    setOpportunities((arr) => arr.map((t) => t.quoteGroupId === quoteGroupId ? { ...t, quoteGroupId: undefined } : t));
  }, []);

  const addMessage = useCallback((id: string, text: string, files: File[]) => {
    const clean = text.trim();
    if (!clean && files.length === 0) return;
    setOpportunities((arr) => arr.map((t) => {
      if (t.id !== id) return t;
      const at = new Date().toISOString();
      const newAtts: TaskAttachment[] = files.map((f, i) => ({
        id: `at${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        name: f.name, size: f.size, type: f.type || "file",
        url: URL.createObjectURL(f), uploadedAt: at,
      }));
      const commentId = `cm${Date.now()}`;
      const comment: TaskComment = {
        id: commentId, authorId: me, text: clean, createdAt: at,
        attachmentIds: newAtts.length ? newAtts.map((a) => a.id) : undefined,
      };
      return {
        ...t,
        attachments: [...t.attachments, ...newAtts],
        comments: [...t.comments, comment],
        timeline: [...t.timeline, { kind: "comment", at, by: me, commentId }],
      };
    }));
  }, []);

  const addAudioMessage = useCallback((id: string, blob: Blob, durationSec: number) => {
    setOpportunities((arr) => arr.map((t) => {
      if (t.id !== id) return t;
      const at = new Date().toISOString();
      const attId = `at${Date.now()}-a-${Math.random().toString(36).slice(2, 7)}`;
      const att: TaskAttachment = {
        id: attId,
        name: `Áudio ${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`,
        size: blob.size,
        type: "audio/webm",
        url: URL.createObjectURL(blob),
        uploadedAt: at,
      };
      const commentId = `cm${Date.now()}`;
      const comment: TaskComment = {
        id: commentId, authorId: me, text: "", createdAt: at, attachmentIds: [attId],
      };
      return {
        ...t,
        attachments: [...t.attachments, att],
        comments: [...t.comments, comment],
        timeline: [...t.timeline, { kind: "comment", at, by: me, commentId }],
      };
    }));
  }, []);

  const editComment = useCallback((id: string, commentId: string, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setOpportunities((arr) => arr.map((t) => {
      if (t.id !== id) return t;
      return {
        ...t,
        comments: t.comments.map((c) =>
          c.id === commentId && c.authorId === me && c.text !== clean
            ? { ...c, text: clean, editedAt: new Date().toISOString(), editedBy: me }
            : c,
        ),
      };
    }));
  }, []);

  const deleteComment = useCallback((id: string, commentId: string) => {
    setOpportunities((arr) => arr.map((t) => {
      if (t.id !== id) return t;
      const c = t.comments.find((x) => x.id === commentId);
      if (!c || c.authorId !== me) return t;
      const attIds = new Set(c.attachmentIds ?? []);
      return {
        ...t,
        comments: t.comments.filter((x) => x.id !== commentId),
        attachments: t.attachments.filter((a) => !attIds.has(a.id)),
        timeline: t.timeline.filter((ev) => !(ev.kind === "comment" && ev.commentId === commentId)),
      };
    }));
  }, []);

  const removeCommentAttachment = useCallback((id: string, commentId: string, attachmentId: string) => {
    setOpportunities((arr) => arr.map((t) => {
      if (t.id !== id) return t;
      const c = t.comments.find((x) => x.id === commentId);
      if (!c || c.authorId !== me) return t;
      return {
        ...t,
        attachments: t.attachments.filter((a) => a.id !== attachmentId),
        comments: t.comments.map((x) =>
          x.id === commentId
            ? { ...x, attachmentIds: (x.attachmentIds ?? []).filter((aid) => aid !== attachmentId), editedAt: new Date().toISOString(), editedBy: me }
            : x,
        ),
      };
    }));
  }, []);

  const addAttachment = useCallback((id: string, file: File) => {
    setOpportunities((arr) => arr.map((t) => {
      if (t.id !== id) return t;
      const attId = `at${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const at = new Date().toISOString();
      const att: TaskAttachment = {
        id: attId, name: file.name, size: file.size, type: file.type || "file",
        url: URL.createObjectURL(file), uploadedAt: at,
      };
      return {
        ...t,
        attachments: [...t.attachments, att],
        timeline: [...t.timeline, { kind: "attachment", at, by: me, attachmentId: attId }],
      };
    }));
  }, []);

  const togglePinComment = useCallback((id: string, commentId: string) => {
    setOpportunities((arr) => arr.map((t) => {
      if (t.id !== id) return t;
      const target = t.comments.find((c) => c.id === commentId);
      if (!target) return t;
      const pinnedCount = t.comments.filter((c) => c.pinned).length;
      if (!target.pinned && pinnedCount >= MAX_PINNED_COMMENTS) return t;
      return {
        ...t,
        comments: t.comments.map((c) => c.id === commentId ? { ...c, pinned: !c.pinned } : c),
      };
    }));
  }, []);

  const indexByGroup = useMemo(() => {
    const m = new Map<string, Opportunity>();
    opportunities.forEach((o) => { if (o.quoteGroupId) m.set(o.quoteGroupId, o); });
    return m;
  }, [opportunities]);

  const byQuoteGroup = useCallback((groupId: string) => indexByGroup.get(groupId), [indexByGroup]);

  const value: Ctx = {
    opportunities, currentUserId: me, byQuoteGroup, moveStage, linkQuoteGroup, createFromQuote, createOpportunity,
    setEstimatedValue, updateOpportunity, deleteOpportunity, unlinkQuoteGroup,
    addMessage, addAudioMessage, editComment, deleteComment, removeCommentAttachment, addAttachment, togglePinComment,
  };
  return createElement(PipelineContext.Provider, { value }, children);
}

export function usePipelineStore() {
  const c = useContext(PipelineContext);
  if (!c) throw new Error("usePipelineStore must be used within PipelineStoreProvider");
  return c;
}
