/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { supabase } from "@/integrations/supabase/client";
import * as api from "./tasks.functions";
import {
  MAX_PINNED_COMMENTS,
  type AttachmentInput,
  type BoardData,
  type NewTaskInput,
  type Priority,
  type ScheduledTask,
  type TaskColumn,
  type TaskItem,
  type TaskPatch,
} from "./types";

export {
  MESSAGE_PREVIEW_LIMIT,
  MAX_PINNED_COMMENTS,
  PRIORITY_META,
  COLUMN_PALETTE,
} from "./types";
export type {
  Priority,
  TaskColumn,
  TaskComment,
  TaskAttachment,
  TaskTimelineEvent,
  TaskItem,
  ScheduledKind,
  PeriodKind,
  ScheduledTask,
  Recurrence,
} from "./types";

const BUCKET = "task-attachments";
const EMPTY: BoardData = { columns: [], tasks: [], scheduled: [] };

type Ctx = {
  columns: TaskColumn[];
  tasks: TaskItem[];
  scheduled: ScheduledTask[];
  currentUserId: string;
  loading: boolean;
  addTask: (t: NewTaskInput) => Promise<TaskItem>;
  bulkAddTasks: (records: NewTaskInput[]) => void;
  moveTask: (id: string, columnId: string) => void;
  deleteTask: (id: string) => void;
  updateTaskFields: (id: string, patch: TaskPatch) => void;
  addComment: (taskId: string, text: string) => void;
  addMessage: (taskId: string, text: string, files: File[]) => void;
  addAudioMessage: (taskId: string, blob: Blob, durationSec: number) => void;
  editComment: (taskId: string, commentId: string, text: string) => void;
  removeCommentAttachment: (taskId: string, commentId: string, attachmentId: string) => void;
  deleteComment: (taskId: string, commentId: string) => void;
  togglePinComment: (taskId: string, commentId: string) => void;
  addAttachment: (taskId: string, file: File) => void;
  addColumn: (title: string, color: string) => void;
  renameColumn: (id: string, title: string) => void;
  recolorColumn: (id: string, color: string) => void;
  deleteColumn: (id: string) => void;
  addScheduled: (s: Omit<ScheduledTask, "id">) => void;
  updateScheduled: (id: string, patch: Partial<Omit<ScheduledTask, "id">>) => void;
  removeScheduled: (id: string) => void;
};

const TaskCtx = createContext<Ctx | null>(null);
const QK = ["tasks", "board"] as const;

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(-80) || "arquivo";
}

async function uploadFile(taskId: string, file: File | Blob, name: string, type: string) {
  const path = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const currentUserId = useCurrentUserId();
  const qc = useQueryClient();

  const listBoard = useServerFn(api.listBoard);
  const createTaskFn = useServerFn(api.createTask);
  const bulkCreateFn = useServerFn(api.bulkCreateTasks);
  const updateTaskFn = useServerFn(api.updateTask);
  const deleteTaskFn = useServerFn(api.deleteTask);
  const addMessageFn = useServerFn(api.addMessage);
  const editCommentFn = useServerFn(api.editComment);
  const deleteCommentFn = useServerFn(api.deleteComment);
  const togglePinFn = useServerFn(api.togglePinComment);
  const removeAttachmentFn = useServerFn(api.removeAttachment);
  const addAttachmentFn = useServerFn(api.addAttachment);
  const createColumnFn = useServerFn(api.createColumn);
  const updateColumnFn = useServerFn(api.updateColumn);
  const deleteColumnFn = useServerFn(api.deleteColumn);
  const createScheduledFn = useServerFn(api.createScheduled);
  const updateScheduledFn = useServerFn(api.updateScheduled);
  const deleteScheduledFn = useServerFn(api.deleteScheduled);

  const { data, isLoading } = useQuery({
    queryKey: QK,
    queryFn: () => listBoard(),
  });
  const board = data ?? EMPTY;

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

  const addTask = useCallback<Ctx["addTask"]>(
    async (t) => {
      const created = await createTaskFn({ data: t });
      invalidate();
      return created;
    },
    [createTaskFn, invalidate],
  );

  const bulkAddTasks = useCallback<Ctx["bulkAddTasks"]>(
    (records) => {
      if (!records.length) return;
      run(() => bulkCreateFn({ data: { records } }));
    },
    [bulkCreateFn, run],
  );

  const updateTaskFields = useCallback<Ctx["updateTaskFields"]>(
    (id, patch) => run(() => updateTaskFn({ data: { id, patch } })),
    [run, updateTaskFn],
  );

  const moveTask = useCallback(
    (id: string, columnId: string) => {
      const current = board.tasks.find((t) => t.id === id);
      if (current && current.columnId === columnId) return;
      run(() => updateTaskFn({ data: { id, patch: { columnId } } }));
    },
    [board.tasks, run, updateTaskFn],
  );

  const deleteTask = useCallback(
    (id: string) => run(() => deleteTaskFn({ data: { id } })),
    [deleteTaskFn, run],
  );

  const addMessage = useCallback(
    (taskId: string, text: string, files: File[]) => {
      const clean = text.trim();
      if (!clean && files.length === 0) return;
      run(async () => {
        const attachments: AttachmentInput[] = [];
        for (const f of files) {
          const storagePath = await uploadFile(taskId, f, f.name, f.type);
          attachments.push({
            name: f.name,
            size: f.size,
            type: f.type || "file",
            storagePath,
          });
        }
        return addMessageFn({ data: { taskId, text: clean, attachments } });
      });
    },
    [addMessageFn, run],
  );

  const addComment = useCallback(
    (taskId: string, text: string) => {
      const clean = text.trim();
      if (!clean) return;
      run(() => addMessageFn({ data: { taskId, text: clean, attachments: [] } }));
    },
    [addMessageFn, run],
  );

  const addAudioMessage = useCallback(
    (taskId: string, blob: Blob, durationSec: number) => {
      const label = `Áudio ${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`;
      run(async () => {
        const storagePath = await uploadFile(taskId, blob, `${label}.webm`, "audio/webm");
        return addMessageFn({
          data: {
            taskId,
            text: "",
            attachments: [{ name: label, size: blob.size, type: "audio/webm", storagePath }],
          },
        });
      });
    },
    [addMessageFn, run],
  );

  const editComment = useCallback(
    (_taskId: string, commentId: string, text: string) => {
      const clean = text.trim();
      if (!clean) return;
      run(() => editCommentFn({ data: { commentId, text: clean } }));
    },
    [editCommentFn, run],
  );

  const deleteComment = useCallback(
    (_taskId: string, commentId: string) => run(() => deleteCommentFn({ data: { commentId } })),
    [deleteCommentFn, run],
  );

  const removeCommentAttachment = useCallback(
    (_taskId: string, _commentId: string, attachmentId: string) =>
      run(() => removeAttachmentFn({ data: { attachmentId } })),
    [removeAttachmentFn, run],
  );

  const togglePinComment = useCallback(
    (taskId: string, commentId: string) => {
      const task = board.tasks.find((t) => t.id === taskId);
      const target = task?.comments.find((c) => c.id === commentId);
      if (!task || !target) return;
      const pinnedCount = task.comments.filter((c) => c.pinned).length;
      if (!target.pinned && pinnedCount >= MAX_PINNED_COMMENTS) return;
      run(() => togglePinFn({ data: { commentId, pinned: !target.pinned } }));
    },
    [board.tasks, run, togglePinFn],
  );

  const addAttachment = useCallback(
    (taskId: string, file: File) => {
      run(async () => {
        const storagePath = await uploadFile(taskId, file, file.name, file.type);
        return addAttachmentFn({
          data: {
            taskId,
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

  const addColumn = useCallback(
    (title: string, color: string) => run(() => createColumnFn({ data: { title, color } })),
    [createColumnFn, run],
  );
  const renameColumn = useCallback(
    (id: string, title: string) => run(() => updateColumnFn({ data: { id, title } })),
    [run, updateColumnFn],
  );
  const recolorColumn = useCallback(
    (id: string, color: string) => run(() => updateColumnFn({ data: { id, color } })),
    [run, updateColumnFn],
  );
  const deleteColumn = useCallback(
    (id: string) => run(() => deleteColumnFn({ data: { id } })),
    [deleteColumnFn, run],
  );

  const addScheduled = useCallback(
    (s: Omit<ScheduledTask, "id">) => run(() => createScheduledFn({ data: s })),
    [createScheduledFn, run],
  );
  const updateScheduled = useCallback(
    (id: string, patch: Partial<Omit<ScheduledTask, "id">>) =>
      run(() => updateScheduledFn({ data: { id, patch } })),
    [run, updateScheduledFn],
  );
  const removeScheduled = useCallback(
    (id: string) => run(() => deleteScheduledFn({ data: { id } })),
    [deleteScheduledFn, run],
  );

  const value = useMemo<Ctx>(
    () => ({
      columns: board.columns,
      tasks: board.tasks,
      scheduled: board.scheduled,
      currentUserId,
      loading: isLoading,
      addTask,
      bulkAddTasks,
      moveTask,
      deleteTask,
      updateTaskFields,
      addComment,
      addMessage,
      addAudioMessage,
      editComment,
      removeCommentAttachment,
      deleteComment,
      togglePinComment,
      addAttachment,
      addColumn,
      renameColumn,
      recolorColumn,
      deleteColumn,
      addScheduled,
      updateScheduled,
      removeScheduled,
    }),
    [
      board,
      currentUserId,
      isLoading,
      addTask,
      bulkAddTasks,
      moveTask,
      deleteTask,
      updateTaskFields,
      addComment,
      addMessage,
      addAudioMessage,
      editComment,
      removeCommentAttachment,
      deleteComment,
      togglePinComment,
      addAttachment,
      addColumn,
      renameColumn,
      recolorColumn,
      deleteColumn,
      addScheduled,
      updateScheduled,
      removeScheduled,
    ],
  );

  return <TaskCtx.Provider value={value}>{children}</TaskCtx.Provider>;
}

export function useTaskStore() {
  const c = useContext(TaskCtx);
  if (!c) throw new Error("useTaskStore must be used within TaskStoreProvider");
  return c;
}
