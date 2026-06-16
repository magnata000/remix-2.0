import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MessageSquare, Paperclip, Pencil, Trash2, Users } from "lucide-react";
import { formatDateShort } from "@/lib/mock/data";
import { team } from "@/lib/mock/data";
import { MESSAGE_PREVIEW_LIMIT, PRIORITY_META, TaskItem } from "@/lib/tasks/taskStore";
import { nameOf } from "@/components/shared/Timeline";


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
  const lastComment = task.comments.length ? task.comments[task.comments.length - 1] : null;
  const lastCommentAttCount = lastComment?.attachmentIds?.length ?? 0;
  const lastCommentPreview = lastComment
    ? (lastComment.text
        ? (lastComment.text.length > MESSAGE_PREVIEW_LIMIT
            ? lastComment.text.slice(0, MESSAGE_PREVIEW_LIMIT).trimEnd() + "…"
            : lastComment.text)
        : `📎 ${lastCommentAttCount} anexo${lastCommentAttCount === 1 ? "" : "s"}`)
    : null;


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
      {lastComment && lastCommentPreview && (
        <div className="mt-2 rounded-lg bg-muted/60 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground font-medium">
            {nameOf(lastComment.authorId)}
          </p>
          <p className="text-xs mt-0.5 break-words">{lastCommentPreview}</p>
        </div>
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
