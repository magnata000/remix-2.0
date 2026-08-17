import type { Branch, KanbanStage, LostReason } from "@/lib/mock/data";
import type { TaskAttachment, TaskComment, TaskTimelineEvent } from "@/lib/tasks/types";
import type { Opportunity, StageHistoryEntry } from "./types";

export type Row = Record<string, unknown>;

export type OpportunityRows = {
  opportunities: Row[];
  comments: Row[];
  attachments: Row[];
  timeline: Row[];
  /** id → nome do membro, para derivar as iniciais do responsável */
  memberNames: Map<string, string>;
};

export function initialsOfName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

function mapComment(r: Row, attachmentsByComment: Map<string, string[]>): TaskComment {
  const id = r["id"] as string;
  return {
    id,
    authorId: r["author_id"] as string,
    text: (r["body"] as string) ?? "",
    createdAt: r["created_at"] as string,
    editedAt: str(r["edited_at"]),
    editedBy: str(r["edited_by"]),
    attachmentIds: attachmentsByComment.get(id),
    pinned: Boolean(r["pinned"]),
  };
}

function mapAttachment(r: Row, urlByPath: Map<string, string>): TaskAttachment {
  const path = str(r["storage_path"]);
  return {
    id: r["id"] as string,
    name: r["name"] as string,
    size: Number(r["size_bytes"] ?? 0),
    type: (r["mime"] as string) || "file",
    url: (path && urlByPath.get(path)) || "",
    uploadedAt: r["uploaded_at"] as string,
  };
}

function mapTimeline(r: Row): TaskTimelineEvent | null {
  const at = r["at"] as string;
  const by = r["actor_id"] as string;
  switch (r["kind"]) {
    case "created":
      return { kind: "created", at, by };
    case "moved":
      return {
        kind: "moved",
        at,
        by,
        from: (r["from_label"] as string) ?? "?",
        to: (r["to_label"] as string) ?? "?",
      };
    case "comment": {
      const commentId = str(r["comment_id"]);
      return commentId ? { kind: "comment", at, by, commentId } : null;
    }
    case "attachment": {
      const attachmentId = str(r["attachment_id"]);
      return attachmentId ? { kind: "attachment", at, by, attachmentId } : null;
    }
    default:
      return null;
  }
}

function mapStageHistory(v: unknown): StageHistoryEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      stage: e["stage"] as KanbanStage,
      enteredAt: (e["enteredAt"] as string) ?? (e["entered_at"] as string),
      exitedAt: str(e["exitedAt"]) ?? str(e["exited_at"]),
    }))
    .filter((e) => !!e.stage && !!e.enteredAt);
}

export function mapOpportunities(
  rows: OpportunityRows,
  urlByPath: Map<string, string>,
): Opportunity[] {
  const attByComment = new Map<string, string[]>();
  rows.attachments.forEach((a) => {
    const cid = str(a["comment_id"]);
    if (!cid) return;
    const list = attByComment.get(cid) ?? [];
    list.push(a["id"] as string);
    attByComment.set(cid, list);
  });

  const commentsByOpp = new Map<string, TaskComment[]>();
  rows.comments.forEach((c) => {
    const oid = c["opportunity_id"] as string;
    const list = commentsByOpp.get(oid) ?? [];
    list.push(mapComment(c, attByComment));
    commentsByOpp.set(oid, list);
  });

  const attsByOpp = new Map<string, TaskAttachment[]>();
  rows.attachments.forEach((a) => {
    const oid = a["opportunity_id"] as string;
    const list = attsByOpp.get(oid) ?? [];
    list.push(mapAttachment(a, urlByPath));
    attsByOpp.set(oid, list);
  });

  const timelineByOpp = new Map<string, TaskTimelineEvent[]>();
  rows.timeline.forEach((t) => {
    const oid = t["opportunity_id"] as string;
    const ev = mapTimeline(t);
    if (!ev) return;
    const list = timelineByOpp.get(oid) ?? [];
    list.push(ev);
    timelineByOpp.set(oid, list);
  });

  return rows.opportunities.map((r) => {
    const id = r["id"] as string;
    const assigneeId = (r["assignee_id"] as string) ?? "";
    return {
      id,
      title: r["title"] as string,
      clientName: (r["client_name"] as string) ?? "",
      clientId: str(r["client_id"]),
      branch: r["branch"] as Branch,
      estimatedValue: Number(r["estimated_value"] ?? 0),
      dueDate: (str(r["due_date"]) ?? r["created_at"]) as string,
      assigneeId,
      assignee: initialsOfName(rows.memberNames.get(assigneeId) ?? ""),
      stage: r["stage"] as KanbanStage,
      quoteGroupId: str(r["quote_group_id"]),
      lostReason: str(r["lost_reason"]) as LostReason | undefined,
      lostNote: str(r["lost_note"]),
      createdAt: r["created_at"] as string,
      closedAt: str(r["closed_at"]),
      comments: commentsByOpp.get(id) ?? [],
      attachments: attsByOpp.get(id) ?? [],
      timeline: timelineByOpp.get(id) ?? [],
      stageHistory: mapStageHistory(r["stage_history"]),
      slaDueAt: str(r["sla_due_at"]),
      slaHours: r["sla_hours"] == null ? undefined : Number(r["sla_hours"]),
      slaPausedAt: str(r["sla_paused_at"]),
    } satisfies Opportunity;
  });
}
