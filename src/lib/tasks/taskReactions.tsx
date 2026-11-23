import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SmilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getTeamMembers } from "@/lib/team/teamStore";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
type Reaction = { comment_id: string; user_id: string; emoji: string };
const QK = ["tasks", "reactions"] as const;

/** Agrupa as reações por emoji, na ordem em que apareceram. */
export function groupReactions(list: Reaction[]) {
  const map = new Map<string, string[]>();
  list.forEach((r) => map.set(r.emoji, [...(map.get(r.emoji) ?? []), r.user_id]));
  return [...map.entries()].map(([emoji, users]) => ({ emoji, users }));
}

export function useTaskReactions(userId: string) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase.from("task_comment_reactions").select("comment_id,user_id,emoji").order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []) as Reaction[];
    },
  });
  const byComment = useMemo(() => {
    const m = new Map<string, Reaction[]>();
    (data ?? []).forEach((r) => m.set(r.comment_id, [...(m.get(r.comment_id) ?? []), r]));
    return m;
  }, [data]);
  const toggle = useCallback(
    async (commentId: string, emoji: string) => {
      if (!userId) return;
      const mine = (data ?? []).some((r) => r.comment_id === commentId && r.user_id === userId && r.emoji === emoji);
      qc.setQueryData(QK, (old: Reaction[] | undefined) =>
        mine
          ? (old ?? []).filter((r) => !(r.comment_id === commentId && r.user_id === userId && r.emoji === emoji))
          : [...(old ?? []), { comment_id: commentId, user_id: userId, emoji }],
      );
      const q = supabase.from("task_comment_reactions");
      const { error } = mine
        ? await q.delete().eq("comment_id", commentId).eq("user_id", userId).eq("emoji", emoji)
        : await q.insert({ comment_id: commentId, user_id: userId, emoji });
      if (error) void qc.invalidateQueries({ queryKey: QK });
    },
    [data, qc, userId],
  );
  return { byComment, toggle };
}

const nameOf = (id: string) => getTeamMembers().find((m) => m.id === id)?.name ?? "—";

/** Selos de reação + botão para reagir (estilo WhatsApp). */
export function ReactionBar({
  reactions,
  userId,
  onToggle,
  compact,
}: {
  reactions: Reaction[];
  userId: string;
  onToggle: (emoji: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const groups = groupReactions(reactions);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1" onClick={stop} onPointerDown={stop}>
      {groups.map((g) => {
        const mine = g.users.includes(userId);
        return (
          <button
            key={g.emoji}
            type="button"
            onClick={() => onToggle(g.emoji)}
            title={g.users.map(nameOf).join(", ")}
            className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 leading-5 ${compact ? "text-[10px]" : "text-xs"} ${mine ? "border-brand/60 bg-brand/10" : "border-border bg-background"}`}
          >
            <span>{g.emoji}</span>
            {g.users.length > 1 && <span className="text-muted-foreground">{g.users.length}</span>}
          </button>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Reagir à mensagem"
            title="Reagir"
            className={`text-muted-foreground hover:text-foreground transition ${groups.length ? "" : "opacity-0 group-hover/reactable:opacity-100 focus:opacity-100"}`}
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1 rounded-full flex gap-0.5" onClick={stop} side="top">
          {QUICK_REACTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onToggle(e);
                setOpen(false);
              }}
              className="text-lg h-8 w-8 rounded-full hover:bg-muted transition hover:scale-110"
            >
              {e}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
