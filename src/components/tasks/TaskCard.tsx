import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MessageSquare, Paperclip, Pencil, Trash2, Users } from "lucide-react";
import { formatDateShort } from "@/lib/mock/data";
import { team } from "@/lib/mock/data";
import { PRIORITY_META, TaskItem } from "@/lib/tasks/taskStore";

type Props = {
  task: TaskItem;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function TaskCard({ task, onClick, onEdit, onDelete }: Props) {
  const isAll = task.assigneeId === "all";
  const assignee = team.find((m) => m.id === task.assigneeId);
  const initials = assignee?.name.split(" ").map((p) => p[0]).slice(0, 2).join("") ?? "??";
  const pr = PRIORITY_META[task.priority];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative w-full text-left bg-card border border-border rounded-xl p-3 hover:border-brand transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
        <button
          type="button"
          aria-label="Editar tarefa"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Excluir tarefa"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-start justify-between gap-2 pr-16">
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
              {formatDateShort(task.dueDate)}
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
        <Avatar className="h-6 w-6" title={isAll ? "Todos" : assignee?.name}>
          <AvatarFallback className="text-[10px] bg-brand-soft text-brand-foreground font-semibold">
            {isAll ? <Users className="h-3.5 w-3.5" /> : initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
