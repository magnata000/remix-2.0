import type {
  BoardData,
  Priority,
  ScheduledKind,
  ScheduledTask,
  TaskAttachment,
  TaskColumn,
  TaskComment,
  TaskItem,
  TaskTimelineEvent,
} from "./types";
import type { Recurrence } from "./recurrence";

export type Row = Record<string, unknown>;

export type BoardRows = {
  columns: Row[];
  tasks: Row[];
  comments: Row[];
  attachments: Row[];
  timeline: Row[];
  scheduled: Row[];
};

const s = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const opt = (v: unknown): string | undefined =>
  typeof v === "string" && v.length ? v : undefined;

export function mapBoard(rows: BoardRows, urlByPath: Map<string, string>): BoardData {
  const columns: TaskColumn[] = rows.columns.map((c) => ({
    id: s(c["id"]),
    title: s(c["title"]),
    color: s(c["color"]) || "#64748B",
  }));

  const attachmentsByTask = new Map<string, TaskAttachment[]>();
  const attachmentIdsByComment = new Map<string, string[]>();
  rows.attachments.forEach((a) => {
    const path = opt(a["storage_path"]);
    const att: TaskAttachment = {
      id: s(a["id"]),
      name: s(a["name"]),
      size: Number(a["size_bytes"] ?? 0),
      type: s(a["mime"]) || "file",
      url: (path && urlByPath.get(path)) || "",
      uploadedAt: s(a["uploaded_at"]),
    };
    const taskId = s(a["task_id"]);
    const list = attachmentsByTask.get(taskId) ?? [];
    list.push(att);
    attachmentsByTask.set(taskId, list);
    const commentId = opt(a["comment_id"]);
    if (commentId) {
      const ids = attachmentIdsByComment.get(commentId) ?? [];
      ids.push(att.id);
      attachmentIdsByComment.set(commentId, ids);
    }
  });

  const commentsByTask = new Map<string, TaskComment[]>();
  rows.comments.forEach((c) => {
    const id = s(c["id"]);
    const comment: TaskComment = {
      id,
      authorId: s(c["author_id"]),
      text: s(c["body"]),
      createdAt: s(c["created_at"]),
      editedAt: opt(c["edited_at"]),
      editedBy: opt(c["edited_by"]),
      attachmentIds: attachmentIdsByComment.get(id),
      pinned: c["pinned"] === true,
    };
    const taskId = s(c["task_id"]);
    const list = commentsByTask.get(taskId) ?? [];
    list.push(comment);
    commentsByTask.set(taskId, list);
  });

  const timelineByTask = new Map<string, TaskTimelineEvent[]>();
  rows.timeline.forEach((t) => {
    const at = s(t["at"]);
    const by = s(t["actor_id"]);
    const kind = s(t["kind"]);
    let ev: TaskTimelineEvent | null = null;
    if (kind === "created") ev = { kind: "created", at, by };
    else if (kind === "moved")
      ev = { kind: "moved", at, by, from: s(t["from_label"]), to: s(t["to_label"]) };
    else if (kind === "comment")
      ev = { kind: "comment", at, by, commentId: s(t["comment_id"]) };
    else if (kind === "attachment")
      ev = { kind: "attachment", at, by, attachmentId: s(t["attachment_id"]) };
    if (!ev) return;
    const taskId = s(t["task_id"]);
    const list = timelineByTask.get(taskId) ?? [];
    list.push(ev);
    timelineByTask.set(taskId, list);
  });

  const tasks: TaskItem[] = rows.tasks.map((t) => {
    const id = s(t["id"]);
    return {
      id,
      title: s(t["title"]),
      description: s(t["description"]),
      dueDate: opt(t["due_date"]),
      priority: (t["priority"] as Priority) ?? "media",
      assigneeId: s(t["assignee_id"]),
      clientName: opt(t["client_name"]),
      columnId: s(t["column_id"]),
      createdAt: s(t["created_at"]),
      comments: commentsByTask.get(id) ?? [],
      attachments: attachmentsByTask.get(id) ?? [],
      timeline: timelineByTask.get(id) ?? [],
      sourceKey: opt(t["source_key"]),
      slaDueAt: opt(t["sla_due_at"]),
      slaHours: t["sla_hours"] == null ? undefined : Number(t["sla_hours"]),
      slaPausedAt: opt(t["sla_paused_at"]),
    };
  });

  const scheduled: ScheduledTask[] = rows.scheduled.map((r) => ({
    id: s(r["id"]),
    title: s(r["title"]),
    description: opt(r["description"]),
    assigneeId: s(r["assignee_id"]),
    priority: (r["priority"] as Priority) ?? "media",
    kind: (r["kind"] as ScheduledKind) ?? "data",
    createdAt: opt(r["created_at"]),
    startDate: opt(r["start_date"]),
    endDate: opt(r["end_date"]),
    weekdays: Array.isArray(r["weekdays"]) ? (r["weekdays"] as number[]) : undefined,
    period: (r["period"] as ScheduledTask["period"]) ?? undefined,
    recurrence: (r["recurrence"] as Recurrence | null) ?? undefined,
  }));

  return { columns, tasks, scheduled };
}
