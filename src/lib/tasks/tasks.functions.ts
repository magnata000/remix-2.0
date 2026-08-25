import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  mapBoard,
  type BoardRows,
  type Row,
} from "./tasks.mapper";
import type {
  AttachmentInput,
  BoardData,
  NewTaskInput,
  ScheduledTask,
  TaskItem,
  TaskPatch,
} from "./types";

const BUCKET = "task-attachments";

/** "all"/vazio não cabem na coluna uuid assignee_id — cai para o usuário logado. */
const normAssignee = (a: string | undefined, fallback: string) =>
  !a || a === "all" ? fallback : a;

/* --------------------------------------------------------------- leitura */

export const listBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BoardData> => {
    const { supabase } = context;

    const [cols, tasks, comments, atts, timeline, scheduled] = await Promise.all([
      supabase.from("task_columns").select("*").order("order_index"),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("task_comments").select("*").order("created_at"),
      supabase.from("task_attachments").select("*").order("uploaded_at"),
      supabase.from("task_timeline").select("*").order("at"),
      supabase.from("scheduled_tasks").select("*").order("created_at", { ascending: false }),
    ]);

    const firstError =
      cols.error ?? tasks.error ?? comments.error ?? atts.error ?? timeline.error ?? scheduled.error;
    if (firstError) throw new Error(firstError.message);

    const attRows = (atts.data ?? []) as Row[];
    const paths = attRows
      .map((a) => a["storage_path"])
      .filter((p): p is string => typeof p === "string" && p.length > 0);

    const urlByPath = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, 60 * 60 * 8);
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
      });
    }

    const rows: BoardRows = {
      columns: (cols.data ?? []) as Row[],
      tasks: (tasks.data ?? []) as Row[],
      comments: (comments.data ?? []) as Row[],
      attachments: attRows,
      timeline: (timeline.data ?? []) as Row[],
      scheduled: (scheduled.data ?? []) as Row[],
    };
    return mapBoard(rows, urlByPath);
  });

/* --------------------------------------------------------------- tarefas */

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: NewTaskInput) => d)
  .handler(async ({ data, context }): Promise<TaskItem> => {
    const { supabase, userId } = context;
    const assignee = normAssignee(data.assigneeId, userId);
    const { data: row, error } = await supabase
      .from("tasks")
      .insert({
        title: data.title,
        description: data.description ?? null,
        due_date: data.dueDate ? data.dueDate.slice(0, 10) : null,
        priority: data.priority,
        assignee_id: assignee,
        client_name: data.clientName ?? null,
        column_id: data.columnId,
        source_key: data.sourceKey ?? null,
        sla_due_at: data.slaDueAt ?? null,
        sla_hours: data.slaHours ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase
      .from("task_timeline")
      .insert({ task_id: (row as Row)["id"] as string, kind: "created", actor_id: userId });

    const board = mapBoard(
      {
        columns: [],
        tasks: [row as Row],
        comments: [],
        attachments: [],
        timeline: [],
        scheduled: [],
      },
      new Map(),
    );
    return board.tasks[0];
  });

export const bulkCreateTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { records: NewTaskInput[] }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.records.length) return { created: 0 };
    const payload = data.records.map((r) => ({
      title: r.title,
      description: r.description ?? null,
      due_date: r.dueDate ? r.dueDate.slice(0, 10) : null,
      priority: r.priority,
      assignee_id: normAssignee(r.assigneeId, userId),
      client_name: r.clientName ?? null,
      column_id: r.columnId,
      source_key: r.sourceKey ?? null,
      sla_due_at: r.slaDueAt ?? null,
      sla_hours: r.slaHours ?? null,
    }));
    const { data: rows, error } = await supabase
      .from("tasks")
      .upsert(payload, { onConflict: "source_key", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(error.message);
    const created = (rows ?? []) as Row[];
    if (created.length) {
      await supabase.from("task_timeline").insert(
        created.map((r) => ({
          task_id: r["id"] as string,
          kind: "created",
          actor_id: userId,
        })),
      );
    }
    return { created: created.length };
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; patch: TaskPatch }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, patch } = data;

    const { data: current, error: curErr } = await supabase
      .from("tasks")
      .select("column_id")
      .eq("id", id)
      .maybeSingle();
    if (curErr) throw new Error(curErr.message);

    const upd: Record<string, unknown> = {};
    if (patch.title !== undefined) upd["title"] = patch.title;
    if (patch.description !== undefined) upd["description"] = patch.description;
    if (patch.dueDate !== undefined)
      upd["due_date"] = patch.dueDate ? patch.dueDate.slice(0, 10) : null;
    if (patch.priority !== undefined) upd["priority"] = patch.priority;
    if (patch.assigneeId !== undefined) upd["assignee_id"] = patch.assigneeId || userId;
    if (patch.clientName !== undefined) upd["client_name"] = patch.clientName ?? null;
    if (patch.columnId !== undefined) upd["column_id"] = patch.columnId;
    if (patch.slaDueAt !== undefined) upd["sla_due_at"] = patch.slaDueAt ?? null;
    if (patch.slaHours !== undefined) upd["sla_hours"] = patch.slaHours ?? null;
    if (patch.slaPausedAt !== undefined) upd["sla_paused_at"] = patch.slaPausedAt ?? null;

    const prevColumn = (current as Row | null)?.["column_id"] as string | undefined;
    const movedTo = patch.columnId && patch.columnId !== prevColumn ? patch.columnId : null;

    if (movedTo) {
      const { data: colRows } = await supabase.from("task_columns").select("id, title");
      const titleOf = (cid?: string) =>
        ((colRows ?? []) as Row[]).find((c) => c["id"] === cid)?.["title"] as string | undefined;
      const toTitle = titleOf(movedTo) ?? "?";
      const terminal = /conclu|finaliz|done/i.test(toTitle);
      upd["sla_paused_at"] = terminal ? new Date().toISOString() : null;
      upd["completed_at"] = terminal ? new Date().toISOString() : null;

      const { error } = await supabase.from("tasks").update(upd as never).eq("id", id);
      if (error) throw new Error(error.message);

      await supabase.from("task_timeline").insert({
        task_id: id,
        kind: "moved",
        actor_id: userId,
        from_label: titleOf(prevColumn) ?? "?",
        to_label: toTitle,
      });
      return { ok: true };
    }

    if (Object.keys(upd).length === 0) return { ok: true };
    const { error } = await supabase.from("tasks").update(upd as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: atts } = await context.supabase
      .from("task_attachments")
      .select("storage_path")
      .eq("task_id", data.id);
    const paths = ((atts ?? []) as Row[])
      .map((a) => a["storage_path"])
      .filter((p): p is string => typeof p === "string" && !!p);
    if (paths.length) await context.supabase.storage.from(BUCKET).remove(paths);

    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------ mensagens */

export const addMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { taskId: string; text: string; attachments: AttachmentInput[] }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: comment, error } = await supabase
      .from("task_comments")
      .insert({ task_id: data.taskId, author_id: userId, body: data.text })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const commentId = (comment as Row)["id"] as string;

    if (data.attachments.length) {
      const { error: attErr } = await supabase.from("task_attachments").insert(
        data.attachments.map((a) => ({
          task_id: data.taskId,
          comment_id: commentId,
          name: a.name,
          size_bytes: a.size,
          mime: a.type,
          storage_path: a.storagePath,
        })),
      );
      if (attErr) throw new Error(attErr.message);
    }

    await supabase.from("task_timeline").insert({
      task_id: data.taskId,
      kind: "comment",
      actor_id: userId,
      comment_id: commentId,
    });
    return { id: commentId };
  });

export const editComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { commentId: string; text: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("task_comments")
      .update({
        body: data.text,
        edited_at: new Date().toISOString(),
        edited_by: context.userId,
      })
      .eq("id", data.commentId)
      .eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { commentId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: atts } = await supabase
      .from("task_attachments")
      .select("storage_path")
      .eq("comment_id", data.commentId);
    const paths = ((atts ?? []) as Row[])
      .map((a) => a["storage_path"])
      .filter((p): p is string => typeof p === "string" && !!p);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);

    await supabase.from("task_timeline").delete().eq("comment_id", data.commentId);
    const { error } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", data.commentId)
      .eq("author_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePinComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { commentId: string; pinned: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("task_comments")
      .update({ pinned: data.pinned })
      .eq("id", data.commentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attachmentId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("task_attachments")
      .select("storage_path")
      .eq("id", data.attachmentId)
      .maybeSingle();
    const path = (row as Row | null)?.["storage_path"];
    if (typeof path === "string" && path) await supabase.storage.from(BUCKET).remove([path]);
    await supabase.from("task_timeline").delete().eq("attachment_id", data.attachmentId);
    const { error } = await supabase.from("task_attachments").delete().eq("id", data.attachmentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { taskId: string; attachment: AttachmentInput }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("task_attachments")
      .insert({
        task_id: data.taskId,
        name: data.attachment.name,
        size_bytes: data.attachment.size,
        mime: data.attachment.type,
        storage_path: data.attachment.storagePath,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("task_timeline").insert({
      task_id: data.taskId,
      kind: "attachment",
      actor_id: userId,
      attachment_id: (row as Row)["id"] as string,
    });
    return { ok: true };
  });

/* --------------------------------------------------------------- colunas */

export const createColumn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; color: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cols } = await supabase.from("task_columns").select("order_index");
    const next = ((cols ?? []) as Row[]).reduce(
      (m, c) => Math.max(m, Number(c["order_index"] ?? 0)),
      -1,
    );
    const { error } = await supabase.from("task_columns").insert({
      id: `c-${Date.now()}`,
      title: data.title.trim() || "Nova coluna",
      color: data.color,
      order_index: next + 1,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateColumn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; title?: string; color?: string }) => d)
  .handler(async ({ data, context }) => {
    const upd: Record<string, unknown> = {};
    if (data.title !== undefined) upd["title"] = data.title;
    if (data.color !== undefined) upd["color"] = data.color;
    if (!Object.keys(upd).length) return { ok: true };
    const { error } = await context.supabase.from("task_columns").update(upd as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteColumn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cols } = await supabase.from("task_columns").select("id").order("order_index");
    const list = ((cols ?? []) as Row[]).map((c) => c["id"] as string);
    if (list.length <= 1) return { ok: false };
    const fallback = list.find((id) => id !== data.id);
    if (fallback) await supabase.from("tasks").update({ column_id: fallback }).eq("column_id", data.id);
    const { error } = await supabase.from("task_columns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------- agendadas */

export const createScheduled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Omit<ScheduledTask, "id">) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("scheduled_tasks").insert({
      title: data.title,
      description: data.description ?? null,
      assignee_id: normAssignee(data.assigneeId, context.userId),
      priority: data.priority,
      kind: data.kind,
      start_date: data.startDate ?? null,
      end_date: data.endDate ?? null,
      weekdays: data.weekdays ?? null,
      period: data.period ?? null,
      recurrence: data.recurrence ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateScheduled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; patch: Partial<Omit<ScheduledTask, "id">> }) => d)
  .handler(async ({ data, context }) => {
    const p = data.patch;
    const upd: Record<string, unknown> = {};
    if (p.title !== undefined) upd["title"] = p.title;
    if (p.description !== undefined) upd["description"] = p.description ?? null;
    if (p.assigneeId !== undefined) upd["assignee_id"] = normAssignee(p.assigneeId, context.userId);
    if (p.priority !== undefined) upd["priority"] = p.priority;
    if (p.kind !== undefined) upd["kind"] = p.kind;
    if (p.startDate !== undefined) upd["start_date"] = p.startDate ?? null;
    if (p.endDate !== undefined) upd["end_date"] = p.endDate ?? null;
    if (p.weekdays !== undefined) upd["weekdays"] = p.weekdays ?? null;
    if (p.period !== undefined) upd["period"] = p.period ?? null;
    if (p.recurrence !== undefined) upd["recurrence"] = p.recurrence ?? null;
    if (!Object.keys(upd).length) return { ok: true };
    const { error } = await context.supabase
      .from("scheduled_tasks")
      .update(upd as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteScheduled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("scheduled_tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
