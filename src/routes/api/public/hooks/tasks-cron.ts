import { createFileRoute } from "@tanstack/react-router";
import { computeDueScheduledTasks } from "@/lib/tasks/schedulerEngine";
import type { ScheduledTask } from "@/lib/tasks/types";

/**
 * Cron diário (pg_cron → pg_net) que transforma agendamentos em cartões.
 * Idempotente: upsert com ignoreDuplicates em source_key. Não retorna dados
 * pessoais — apenas a contagem de cartões criados.
 */
export const Route = createFileRoute("/api/public/hooks/tasks-cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const [cols, sched] = await Promise.all([
          supabaseAdmin.from("task_columns").select("id").order("order_index").limit(1),
          supabaseAdmin.from("scheduled_tasks").select("*"),
        ]);
        if (cols.error || sched.error) {
          console.error("tasks-cron load error", cols.error ?? sched.error);
          return Response.json({ error: "load failed" }, { status: 500 });
        }
        const columnId = cols.data?.[0]?.id;
        if (!columnId) return Response.json({ created: 0 });

        const scheduled: ScheduledTask[] = (sched.data ?? []).map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description ?? undefined,
          assigneeId: r.assignee_id,
          priority: r.priority,
          kind: r.kind,
          createdAt: r.created_at ?? undefined,
          startDate: r.start_date ?? undefined,
          endDate: r.end_date ?? undefined,
          weekdays: r.weekdays ?? undefined,
          period: (r.period as ScheduledTask["period"]) ?? undefined,
          recurrence: (r.recurrence as unknown as ScheduledTask["recurrence"]) ?? undefined,
        }));

        // "Hoje" no horário de Brasília (UTC-3), independente do fuso do servidor.
        const nowBrt = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const now = new Date(nowBrt.getUTCFullYear(), nowBrt.getUTCMonth(), nowBrt.getUTCDate());
        const due = computeDueScheduledTasks({ scheduled, defaultColumnId: columnId, now });
        if (!due.length) return Response.json({ created: 0 });

        const { data: rows, error } = await supabaseAdmin
          .from("tasks")
          .upsert(
            due.map((r) => ({
              title: r.title,
              description: r.description ?? null,
              due_date: r.dueDate ? r.dueDate.slice(0, 10) : null,
              priority: r.priority,
              assignee_id: r.assigneeId,
              column_id: r.columnId,
              source_key: r.sourceKey ?? null,
            })),
            { onConflict: "source_key", ignoreDuplicates: true },
          )
          .select("id, assignee_id");
        if (error) {
          console.error("tasks-cron insert error", error);
          return Response.json({ error: "insert failed" }, { status: 500 });
        }
        if (rows?.length) {
          await supabaseAdmin.from("task_timeline").insert(
            rows.map((r) => ({ task_id: r.id, kind: "created", actor_id: r.assignee_id })),
          );
        }
        return Response.json({ created: rows?.length ?? 0 });
      },
    },
  },
});
