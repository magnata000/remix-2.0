import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TaskItem } from "./types";

const QK = ["tasks", "reads"] as const;
/** Sem registro de leitura: só conta como nova mensagem se for dos últimos 7 dias. */
const NO_READ_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function hasUnreadMessages(task: TaskItem, userId: string, lastReadAt: string | undefined, now = Date.now()) {
  const since = lastReadAt ? +new Date(lastReadAt) : now - NO_READ_WINDOW_MS;
  return task.comments.some((c) => c.authorId !== userId && +new Date(c.createdAt) > since);
}

export function useTaskReads(userId: string) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: [...QK, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("task_reads").select("task_id,last_read_at").eq("user_id", userId);
      if (error) throw new Error(error.message);
      return Object.fromEntries((data ?? []).map((r) => [r.task_id, r.last_read_at])) as Record<string, string>;
    },
  });
  const reads = useMemo(() => data ?? {}, [data]);
  const markRead = useCallback(
    async (taskId: string) => {
      if (!userId) return;
      const at = new Date().toISOString();
      qc.setQueryData([...QK, userId], (old: Record<string, string> | undefined) => ({ ...(old ?? {}), [taskId]: at }));
      await supabase.from("task_reads").upsert({ user_id: userId, task_id: taskId, last_read_at: at });
    },
    [qc, userId],
  );
  return { reads, markRead };
}
