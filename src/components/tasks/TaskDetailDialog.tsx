import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Paperclip, Send, Upload, Calendar, User, Tag, Layers, FileText, Pencil } from "lucide-react";
import { team, formatDate } from "@/lib/mock/data";
import { PRIORITY_META, TaskComment, TaskItem, useTaskStore } from "@/lib/tasks/taskStore";
import { MentionInput, renderMentions } from "./MentionInput";

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const initialsOf = (id: string) => {
  const m = team.find((x) => x.id === id);
  return m?.name.split(" ").map((p) => p[0]).slice(0, 2).join("") ?? "??";
};
const nameOf = (id: string) => team.find((x) => x.id === id)?.name ?? "—";
const formatTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function TaskDetailDialog({ task, onOpenChange }: { task: TaskItem | null; onOpenChange: (v: boolean) => void }) {
  const { columns, addComment, editComment, addAttachment, currentUserId } = useTaskStore();
  const [text, setText] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const column = useMemo(() => columns.find((c) => c.id === task?.columnId), [columns, task]);
  if (!task) return null;
  const pr = PRIORITY_META[task.priority];

  const submit = () => {
    if (!text.trim()) return;
    addComment(task.id, text.trim());
    setText("");
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => addAttachment(task.id, f));
  };

  return (
    <Dialog open={!!task} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <span className="flex-1">{task.title}</span>
            <Badge className={`${pr.className} border-0`}>{pr.label}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-[220px_1fr] gap-4 flex-1 overflow-hidden">
          <aside className="space-y-3 text-sm overflow-y-auto pr-2">
            <Meta icon={<Layers className="h-3.5 w-3.5" />} label="Etapa">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: column?.color }} />
                {column?.title}
              </span>
            </Meta>
            <Meta icon={<User className="h-3.5 w-3.5" />} label="Responsável">
              <span className="inline-flex items-center gap-2">
                <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-brand-soft text-brand-foreground font-semibold">{initialsOf(task.assigneeId)}</AvatarFallback></Avatar>
                {nameOf(task.assigneeId)}
              </span>
            </Meta>
            {task.dueDate && <Meta icon={<Calendar className="h-3.5 w-3.5" />} label="Prazo">{formatDate(task.dueDate)}</Meta>}
            {task.clientName && <Meta icon={<Tag className="h-3.5 w-3.5" />} label="Cliente">{task.clientName}</Meta>}
            {task.description && (
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Descrição</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
          </aside>

          <section className="flex flex-col overflow-hidden border-l border-border pl-4">
            <h3 className="text-sm font-semibold mb-2">Timeline</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {task.timeline.map((ev, i) => {
                if (ev.kind === "created") return (<TimelineRow key={i} authorId={ev.by} at={ev.at}><em className="text-muted-foreground">criou a tarefa</em></TimelineRow>);
                if (ev.kind === "moved") return (<TimelineRow key={i} authorId={ev.by} at={ev.at}><em className="text-muted-foreground">moveu de <strong>{ev.from}</strong> para <strong>{ev.to}</strong></em></TimelineRow>);
                if (ev.kind === "comment") {
                  const c = task.comments.find((x) => x.id === ev.commentId);
                  return c ? (<TimelineRow key={i} authorId={ev.by} at={ev.at}><span>{renderMentions(c.text)}</span></TimelineRow>) : null;
                }
                if (ev.kind === "attachment") {
                  const a = task.attachments.find((x) => x.id === ev.attachmentId);
                  return a ? (
                    <TimelineRow key={i} authorId={ev.by} at={ev.at}>
                      <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand hover:underline">
                        <Paperclip className="h-3 w-3" />{a.name}
                      </a>
                    </TimelineRow>
                  ) : null;
                }
                return null;
              })}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              className={`mt-3 rounded-xl border-2 border-dashed p-3 text-xs text-muted-foreground transition ${dragOver ? "border-brand bg-brand/10" : "border-border"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" /> Arraste arquivos aqui ou</span>
                <Button size="sm" variant="outline" className="rounded-lg h-7" onClick={() => fileInput.current?.click()}>
                  Selecionar
                </Button>
                <input ref={fileInput} type="file" multiple hidden onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
              </div>
            </div>

            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <MentionInput value={text} onChange={setText} onSubmit={submit} placeholder="Escreva um comentário... use @ para mencionar" rows={2} />
              </div>
              <Button onClick={submit} disabled={!text.trim()} className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Meta({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function TimelineRow({ authorId, at, children }: { authorId: string; at: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="text-[10px] bg-brand-soft text-brand-foreground font-semibold">{initialsOf(authorId)}</AvatarFallback></Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{nameOf(authorId)}</span>
          <span className="text-[11px] text-muted-foreground">{formatTime(at)}</span>
        </div>
        <div className="text-sm break-words">{children}</div>
      </div>
    </div>
  );
}
