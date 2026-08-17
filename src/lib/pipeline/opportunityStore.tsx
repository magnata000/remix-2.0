/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { supabase } from "@/integrations/supabase/client";
import { MAX_PINNED_COMMENTS } from "@/lib/tasks/types";
import type { Branch, KanbanStage, LostReason } from "@/lib/mock/data";
import * as api from "./opportunities.functions";
import {
  OPPORTUNITY_BUCKET,
  stageLabels,
  type NewOpportunityInput,
  type Opportunity,
  type OpportunityAttachmentInput,
  type OpportunityPatch,
} from "./types";

export { stageLabels };
export type {
  Opportunity,
  StageHistoryEntry,
  OpportunityPatch,
  NewOpportunityInput,
} from "./types";

const QK = ["pipeline", "opportunities"] as const;
const EMPTY: Opportunity[] = [];

type Ctx = {
  opportunities: Opportunity[];
  currentUserId: string;
  loading: boolean;
  byQuoteGroup: (groupId: string) => Opportunity | undefined;
  moveStage: (id: string, stage: KanbanStage, lostReason?: LostReason, lostNote?: string) => void;
  linkQuoteGroup: (opportunityId: string, quoteGroupId: string) => void;
  createFromQuote: (input: {
    clientName: string;
    branch: Branch;
    estimatedValue: number;
    quoteGroupId: string;
  }) => void;
  createOpportunity: (input: NewOpportunityInput) => Promise<void>;
  setEstimatedValue: (id: string, value: number) => void;
  updateOpportunity: (id: string, patch: OpportunityPatch) => void;
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

function safeName(name: string) {
  return name.replace(/[^\w.-]+/g, "_").slice(-80) || "arquivo";
}

async function uploadFile(opportunityId: string, file: File | Blob, name: string, type: string) {
  const path = `${opportunityId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName(name)}`;
  const { error } = await supabase.storage.from(OPPORTUNITY_BUCKET).upload(path, file, {
    contentType: type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export function PipelineStoreProvider({ children }: { children: ReactNode }) {
  const currentUserId = useCurrentUserId();
  const qc = useQueryClient();

  const listFn = useServerFn(api.listOpportunities);
  const createFn = useServerFn(api.createOpportunity);
  const updateFn = useServerFn(api.updateOpportunity);
  const moveStageFn = useServerFn(api.moveStage);
  const deleteFn = useServerFn(api.deleteOpportunity);
  const unlinkFn = useServerFn(api.unlinkQuoteGroup);
  const addMessageFn = useServerFn(api.addMessage);
  const editCommentFn = useServerFn(api.editComment);
  const deleteCommentFn = useServerFn(api.deleteComment);
  const togglePinFn = useServerFn(api.togglePinComment);
  const addAttachmentFn = useServerFn(api.addAttachment);
  const removeAttachmentFn = useServerFn(api.removeAttachment);

  const { data, isLoading } = useQuery({
    queryKey: QK,
    queryFn: () => listFn(),
  });
  const opportunities = data ?? EMPTY;

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: QK });
  }, [qc]);

  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: invalidate,
  });
  const run = useCallback(
    (fn: () => Promise<unknown>) => {
      mutate.mutate(fn);
    },
    [mutate],
  );

  const createOpportunity = useCallback<Ctx["createOpportunity"]>(
    async (input) => {
      await createFn({ data: { ...input, assigneeId: input.assigneeId || currentUserId } });
      invalidate();
    },
    [createFn, currentUserId, invalidate],
  );

  const createFromQuote = useCallback<Ctx["createFromQuote"]>(
    (input) => {
      const due = new Date();
      due.setDate(due.getDate() + 7);
      run(() =>
        createFn({
          data: {
            title: `Cotação ${input.branch} — ${input.clientName}`,
            clientName: input.clientName,
            branch: input.branch,
            estimatedValue: input.estimatedValue,
            dueDate: due.toISOString().slice(0, 10),
            assigneeId: currentUserId,
            stage: "cotacao",
            quoteGroupId: input.quoteGroupId,
          },
        }),
      );
    },
    [createFn, currentUserId, run],
  );

  const updateOpportunity = useCallback<Ctx["updateOpportunity"]>(
    (id, patch) => {
      run(() => updateFn({ data: { id, patch } }));
    },
    [run, updateFn],
  );

  const setEstimatedValue = useCallback<Ctx["setEstimatedValue"]>(
    (id, value) => {
      run(() => updateFn({ data: { id, patch: { estimatedValue: value } } }));
    },
    [run, updateFn],
  );

  const linkQuoteGroup = useCallback<Ctx["linkQuoteGroup"]>(
    (opportunityId, quoteGroupId) => {
      run(() => updateFn({ data: { id: opportunityId, patch: { quoteGroupId } } }));
    },
    [run, updateFn],
  );

  const unlinkQuoteGroup = useCallback<Ctx["unlinkQuoteGroup"]>(
    (quoteGroupId) => {
      run(() => unlinkFn({ data: { quoteGroupId } }));
    },
    [run, unlinkFn],
  );

  const moveStage = useCallback<Ctx["moveStage"]>(
    (id, stage, lostReason, lostNote) => {
      run(() => moveStageFn({ data: { id, stage, lostReason, lostNote } }));
    },
    [moveStageFn, run],
  );

  const deleteOpportunity = useCallback<Ctx["deleteOpportunity"]>(
    (id) => {
      run(() => deleteFn({ data: { id } }));
    },
    [deleteFn, run],
  );

  const addMessage = useCallback<Ctx["addMessage"]>(
    (id, text, files) => {
      const clean = text.trim();
      if (!clean && files.length === 0) return;
      run(async () => {
        const attachments: OpportunityAttachmentInput[] = [];
        for (const f of files) {
          const storagePath = await uploadFile(id, f, f.name, f.type);
          attachments.push({
            name: f.name,
            size: f.size,
            type: f.type || "file",
            storagePath,
          });
        }
        return addMessageFn({ data: { opportunityId: id, text: clean, attachments } });
      });
    },
    [addMessageFn, run],
  );

  const addAudioMessage = useCallback<Ctx["addAudioMessage"]>(
    (id, blob, durationSec) => {
      const name = `Áudio ${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`;
      run(async () => {
        const storagePath = await uploadFile(id, blob, `${name}.webm`, "audio/webm");
        return addMessageFn({
          data: {
            opportunityId: id,
            text: "",
            attachments: [{ name, size: blob.size, type: "audio/webm", storagePath }],
          },
        });
      });
    },
    [addMessageFn, run],
  );

  const editComment = useCallback<Ctx["editComment"]>(
    (_id, commentId, text) => {
      const clean = text.trim();
      if (!clean) return;
      run(() => editCommentFn({ data: { commentId, text: clean } }));
    },
    [editCommentFn, run],
  );

  const deleteComment = useCallback<Ctx["deleteComment"]>(
    (_id, commentId) => {
      run(() => deleteCommentFn({ data: { commentId } }));
    },
    [deleteCommentFn, run],
  );

  const removeCommentAttachment = useCallback<Ctx["removeCommentAttachment"]>(
    (_id, _commentId, attachmentId) => {
      run(() => removeAttachmentFn({ data: { attachmentId } }));
    },
    [removeAttachmentFn, run],
  );

  const addAttachment = useCallback<Ctx["addAttachment"]>(
    (id, file) => {
      run(async () => {
        const storagePath = await uploadFile(id, file, file.name, file.type);
        return addAttachmentFn({
          data: {
            opportunityId: id,
            attachment: {
              name: file.name,
              size: file.size,
              type: file.type || "file",
              storagePath,
            },
          },
        });
      });
    },
    [addAttachmentFn, run],
  );

  const togglePinComment = useCallback<Ctx["togglePinComment"]>(
    (id, commentId) => {
      const opp = opportunities.find((o) => o.id === id);
      const target = opp?.comments.find((c) => c.id === commentId);
      if (!target) return;
      const pinnedCount = (opp?.comments ?? []).filter((c) => c.pinned).length;
      if (!target.pinned && pinnedCount >= MAX_PINNED_COMMENTS) return;
      run(() => togglePinFn({ data: { commentId, pinned: !target.pinned } }));
    },
    [opportunities, run, togglePinFn],
  );

  const indexByGroup = useMemo(() => {
    const m = new Map<string, Opportunity>();
    opportunities.forEach((o) => {
      if (o.quoteGroupId) m.set(o.quoteGroupId, o);
    });
    return m;
  }, [opportunities]);

  const byQuoteGroup = useCallback((groupId: string) => indexByGroup.get(groupId), [indexByGroup]);

  const value: Ctx = {
    opportunities,
    currentUserId,
    loading: isLoading,
    byQuoteGroup,
    moveStage,
    linkQuoteGroup,
    createFromQuote,
    createOpportunity,
    setEstimatedValue,
    updateOpportunity,
    deleteOpportunity,
    unlinkQuoteGroup,
    addMessage,
    addAudioMessage,
    editComment,
    deleteComment,
    removeCommentAttachment,
    addAttachment,
    togglePinComment,
  };

  return <PipelineContext.Provider value={value}>{children}</PipelineContext.Provider>;
}

export function usePipelineStore() {
  const c = useContext(PipelineContext);
  if (!c) throw new Error("usePipelineStore must be used within PipelineStoreProvider");
  return c;
}
