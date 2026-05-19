import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MessageSquare, Paperclip } from "lucide-react";
import { formatDate } from "@/lib/mock/data";
import { team } from "@/lib/mock/data";
import { PRIORITY_META, TaskItem } from "@/lib/tasks/taskStore";

export function TaskCard({ task, onClick }: { task: TaskItem; onClick: () => void }) {
  const assignee = team.find((m) => m.id === task.assigneeId);
  const initials = assignee?.name.split(" ").map((p) => p[0]).slice(0, 2).join("") ?? "??";
  const pr = PRIORITY_META[task.priority];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl p-3 hover:border-brand transition"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm flex-1 min-w-0">{task.title}</p>
        <Badge className={`${pr.className} border-0 shrink-0`}>{pr.label}</Badge>
      </div>
      {task.clientName && (
        <p className="text-xs text-muted-foreground mt-1 truncate">Cliente · {task.clientName}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.comments.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />{task.comments.length}
            </span>
          )}
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />{task.attachments.length}
            </span>
          )}
        </div>
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[10px] bg-brand-soft text-brand-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </button>
  );
}
