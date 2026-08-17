import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mapOpportunities, type OpportunityRows, type Row } from "./opportunities.mapper";
import type {
  NewOpportunityInput,
  Opportunity,
  OpportunityAttachmentInput,
  OpportunityPatch,
} from "./types";
import type { KanbanStage, LostReason } from "@/lib/mock/data";

const BUCKET = "opportunity-attachments";

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  cotacao: "Cotação",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

/* --------------------------------------------------------------- leitura */

export const listOpportunities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Opportunity[]> => {
    const { supabase } = context;

    const [opps, comments, atts, timeline, members] = await Promise.all([
      supabase.from("opportunities").select("*").order("created_at", { ascending: false }),
      supabase.from("opportunity_comments").select("*").order("created_at"),
      supabase.from("opportunity_attachments").select("*").order("uploaded_at"),
      supabase.from("opportunity_timeline").select("*").order("at"),
      supabase.from("team_members").select("id, name"),
    ]);

    const firstError =
      opps.error ?? comments.error ?? atts.error ?? timeline.error ?? members.error;
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

    const memberNames = new Map<string, string>();
    ((members.data ?? []) as Row[]).forEach((m) => {
      memberNames.set(m["id"] as string, (m["name"] as string) ?? "");
    });

    const rows: OpportunityRows = {
      opportunities: (opps.data ?? []) as Row[],
      comments: (comments.data ?? []) as Row[],
      attachments: attRows,
      timeline: (timeline.data ?? []) as Row[],
      memberNames,
    };
    return mapOpportunities(rows, urlByPath);
  });

/* ---------------------------------------------------------- oportunidades */

export const createOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: NewOpportunityInput) => d)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("opportunities")
      .insert({
        title: data.title,
        client_id: data.clientId ?? null,
        client_name: data.clientName,
        branch: data.branch,
        estimated_value: data.estimatedValue,
        due_date: data.dueDate ? data.dueDate.slice(0, 10) : null,
        stage: data.stage,
        quote_group_id: data.quoteGroupId ?? null,
        assignee_id: data.assigneeId || userId,
        stage_history: [{ stage: data.stage, enteredAt: now }],
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const id = (row as Row)["id"] as string;

    await supabase
      .from("opportunity_timeline")
      .insert({ opportunity_id: id, kind: "created", actor_id: userId });

    return { id };
  });

export const updateOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; patch: OpportunityPatch }) => d)
  .handler(async ({ data, context }) => {
    const { patch } = data;
    const upd: Record<string, unknown> = {};
    if (patch.title !== undefined) upd["title"] = patch.title;
    if (patch.clientName !== undefined) upd["client_name"] = patch.clientName;
    if (patch.clientId !== undefined) upd["client_id"] = patch.clientId;
    if (patch.branch !== undefined) upd["branch"] = patch.branch;
    if (patch.estimatedValue !== undefined) upd["estimated_value"] = patch.estimatedValue;
    if (patch.dueDate !== undefined)
      upd["due_date"] = patch.dueDate ? patch.dueDate.slice(0, 10) : null;
    if (patch.assigneeId !== undefined)
      upd["assignee_id"] = patch.assigneeId || context.userId;
    if (patch.quoteGroupId !== undefined) upd["quote_group_id"] = patch.quoteGroupId;
    if (patch.slaDueAt !== undefined) upd["sla_due_at"] = patch.slaDueAt ?? null;
    if (patch.slaHours !== undefined) upd["sla_hours"] = patch.slaHours ?? null;
    if (patch.slaPausedAt !== undefined) upd["sla_paused_at"] = patch.slaPausedAt ?? null;
    if (!Object.keys(upd).length) return { ok: true };

    const { error } = await context.supabase
      .from("opportunities")
      .update(upd as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moveStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { id: string; stage: KanbanStage; lostReason?: LostReason; lostNote?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: current, error: curErr } = await supabase
      .from("opportunities")
      .select("stage, stage_history, closed_at")
      .eq("id", data.id)
      .maybeSingle();
    if (curErr) throw new Error(curErr.message);
    if (!current) throw new Error("Oportunidade não encontrada");

    const cur = current as Row;
    const from = cur["stage"] as KanbanStage;
    const now = new Date().toISOString();
    const isLost = data.stage === "perdido";
    const terminal = data.stage === "fechado" || isLost;

    const upd: Record<string, unknown> = {
      stage: data.stage,
      lost_reason: isLost ? (data.lostReason ?? null) : null,
      lost_note: isLost ? (data.lostNote ?? null) : null,
    };

    if (from !== data.stage) {
      const history = Array.isArray(cur["stage_history"])
        ? ([...(cur["stage_history"] as Record<string, unknown>[])] as Record<string, unknown>[])
        : [];
      const last = history[history.length - 1];
      if (last && !last["exitedAt"]) last["exitedAt"] = now;
      history.push({ stage: data.stage, enteredAt: now });
      upd["stage_history"] = history;
      upd["closed_at"] = terminal ? now : null;
      upd["sla_paused_at"] = terminal ? now : null;
    }

    const { error } = await supabase
      .from("opportunities")
      .update(upd as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (from !== data.stage) {
      await supabase.from("opportunity_timeline").insert({
        opportunity_id: data.id,
        kind: "moved",
        actor_id: userId,
        from_label: STAGE_LABELS[from] ?? from,
        to_label: STAGE_LABELS[data.stage] ?? data.stage,
      });
    }
    return { ok: true };
  });

export const deleteOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: atts } = await supabase
      .from("opportunity_attachments")
      .select("storage_path")
      .eq("opportunity_id", data.id);
    const paths = ((atts ?? []) as Row[])
      .map((a) => a["storage_path"])
      .filter((p): p is string => typeof p === "string" && !!p);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);

    const { error } = await supabase.from("opportunities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unlinkQuoteGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { quoteGroupId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("opportunities")
      .update({ quote_group_id: null })
      .eq("quote_group_id", data.quoteGroupId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------- mensagens */

export const addMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { opportunityId: string; text: string; attachments: OpportunityAttachmentInput[] }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: comment, error } = await supabase
      .from("opportunity_comments")
      .insert({ opportunity_id: data.opportunityId, author_id: userId, body: data.text })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const commentId = (comment as Row)["id"] as string;

    if (data.attachments.length) {
      const { error: attErr } = await supabase.from("opportunity_attachments").insert(
        data.attachments.map((a) => ({
          opportunity_id: data.opportunityId,
          comment_id: commentId,
          name: a.name,
          size_bytes: a.size,
          mime: a.type,
          storage_path: a.storagePath,
        })),
      );
      if (attErr) throw new Error(attErr.message);
    }

    await supabase.from("opportunity_timeline").insert({
      opportunity_id: data.opportunityId,
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
      .from("opportunity_comments")
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
      .from("opportunity_attachments")
      .select("storage_path")
      .eq("comment_id", data.commentId);
    const paths = ((atts ?? []) as Row[])
      .map((a) => a["storage_path"])
      .filter((p): p is string => typeof p === "string" && !!p);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);

    await supabase.from("opportunity_timeline").delete().eq("comment_id", data.commentId);
    const { error } = await supabase
      .from("opportunity_comments")
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
      .from("opportunity_comments")
      .update({ pinned: data.pinned })
      .eq("id", data.commentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { opportunityId: string; attachment: OpportunityAttachmentInput }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("opportunity_attachments")
      .insert({
        opportunity_id: data.opportunityId,
        name: data.attachment.name,
        size_bytes: data.attachment.size,
        mime: data.attachment.type,
        storage_path: data.attachment.storagePath,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("opportunity_timeline").insert({
      opportunity_id: data.opportunityId,
      kind: "attachment",
      actor_id: userId,
      attachment_id: (row as Row)["id"] as string,
    });
    return { ok: true };
  });

export const removeAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attachmentId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("opportunity_attachments")
      .select("storage_path")
      .eq("id", data.attachmentId)
      .maybeSingle();
    const path = (row as Row | null)?.["storage_path"];
    if (typeof path === "string" && path) await supabase.storage.from(BUCKET).remove([path]);
    await supabase.from("opportunity_timeline").delete().eq("attachment_id", data.attachmentId);
    const { error } = await supabase
      .from("opportunity_attachments")
      .delete()
      .eq("id", data.attachmentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
