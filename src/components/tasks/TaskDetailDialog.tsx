import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Paperclip, Send, Calendar, User, Tag, Layers, FileText, Pencil, X, Trash2, Image as ImageIcon } from "lucide-react";
import { team, formatDateShort } from "@/lib/mock/data";
import { PRIORITY_META, TaskAttachment, TaskComment, TaskItem, useTaskStore } from "@/lib/tasks/taskStore";
import { MentionInput, renderMentions } from "./MentionInput";

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const initialsOf = (id: string) => {
  const m = team.find((x) => x.id === id);
  return m?.name.split(" ").map((p) => p[0]).slice(0, 2).join("") ?? "??";
};
const nameOf = (id: string) => team.find((x) => x.id === id)?.name ?? "—";
const formatTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};
const isImage = (type: string) => type.startsWith("image/");

export function TaskDetailDialog({ task, onOpenChange }: { task: TaskItem | null; onOpenChange: (v: boolean) => void }) {
  const { columns, addMessage, editComment, removeCommentAttachment, deleteComment, currentUserId } = useTaskStore();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [task?.id, task?.timeline.length]);
  const fileInput = useRef<HTMLInputElement>(null);

  const column = useMemo(() => columns.find((c) => c.id === task?.columnId), [columns, task]);
  if (!task) return null;
  const pr = PRIORITY_META[task.priority];

  const canSend = text.trim().length > 0 || pending.length > 0;

  const submit = () => {
    if (!canSend) return;
    addMessage(task.id, text, pending);
    setText("");
    setPending([]);
  };

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files);
    if (list.length) setPending((p) => [...p, ...list]);
  };
  const removePending = (idx: number) => setPending((p) => p.filter((_, i) => i !== idx));

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
            {task.dueDate && <Meta icon={<Calendar className="h-3.5 w-3.5" />} label="Prazo">{formatDateShort(task.dueDate)}</Meta>}
            {task.clientName && <Meta icon={<Tag className="h-3.5 w-3.5" />} label="Cliente">{task.clientName}</Meta>}
            {task.description && (
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Descrição</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
          </aside>

          <section className="flex flex-col overflow-hidden min-h-0 border-l border-border pl-4">
            <h3 className="text-sm font-semibold mb-2">Timeline</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {task.timeline.map((ev, i) => {
                if (ev.kind === "created") return (<TimelineRow key={i} authorId={ev.by} at={ev.at}><em className="text-muted-foreground">criou a tarefa</em></TimelineRow>);
                if (ev.kind === "moved") return (<TimelineRow key={i} authorId={ev.by} at={ev.at}><em className="text-muted-foreground">moveu de <strong>{ev.from}</strong> para <strong>{ev.to}</strong></em></TimelineRow>);
                if (ev.kind === "comment") {
                  const c = task.comments.find((x) => x.id === ev.commentId);
                  if (!c) return null;
                  const atts = (c.attachmentIds ?? [])
                    .map((id) => task.attachments.find((a) => a.id === id))
                    .filter((a): a is TaskAttachment => !!a);
                  return (
                    <TimelineRow key={i} authorId={ev.by} at={ev.at}>
                      <CommentBubble
                        comment={c}
                        attachments={atts}
                        canEdit={c.authorId === currentUserId && Date.now() - new Date(c.createdAt).getTime() < EDIT_WINDOW_MS}
                        onSaveText={(t) => editComment(task.id, c.id, t)}
                        onRemoveAttachment={(aid) => removeCommentAttachment(task.id, c.id, aid)}
                        onDelete={() => deleteComment(task.id, c.id)}
                      />
                    </TimelineRow>
                  );
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
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              className={`mt-3 shrink-0 rounded-xl border bg-muted/60 p-2 transition ${dragOver ? "border-brand ring-2 ring-brand/40 bg-brand/5" : "border-border"}`}
            >
              {pending.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {pending.map((f, i) => <PendingChip key={i} file={f} onRemove={() => removePending(i)} />)}
                </div>
              )}
              <MentionInput
                value={text}
                onChange={setText}
                onSubmit={submit}
                placeholder={dragOver ? "Solte os arquivos para anexar..." : "Escreva um comentário ou solte arquivos aqui... use @ para mencionar"}
                rows={2}
                className="resize-none border-0 bg-transparent focus-visible:ring-0 shadow-none px-2 py-1.5"
              />
              <div className="flex items-center justify-end gap-1 mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInput.current?.click()}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label="Anexar arquivo"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <input ref={fileInput} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                <Button
                  onClick={submit}
                  disabled={!canSend}
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-brand text-brand-foreground hover:bg-brand/90"
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
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

function PendingChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const previewUrl = useMemo(() => (isImage(file.type) ? URL.createObjectURL(file) : null), [file]);
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-background border border-border pl-1 pr-1.5 py-1 text-xs max-w-[220px]">
      {previewUrl ? (
        <img src={previewUrl} alt={file.name} className="h-6 w-6 rounded object-cover" />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="truncate flex-1" title={file.name}>{file.name}</span>
      <span className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</span>
      <button type="button" onClick={onRemove} aria-label="Remover" className="text-muted-foreground hover:text-foreground">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function AttachmentChip({ a, onRemove }: { a: TaskAttachment; onRemove?: () => void }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-background border border-border pl-1 pr-1.5 py-1 text-xs max-w-[220px]">
      <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground">
        {isImage(a.type) ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
      </span>
      <a href={a.url} target="_blank" rel="noreferrer" className="truncate flex-1 text-brand hover:underline" title={a.name}>{a.name}</a>
      <span className="text-[10px] text-muted-foreground">{formatBytes(a.size)}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remover anexo" className="text-muted-foreground hover:text-destructive">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function CommentBubble({
  comment,
  attachments,
  canEdit,
  onSaveText,
  onRemoveAttachment,
  onDelete,
}: {
  comment: TaskComment;
  attachments: TaskAttachment[];
  canEdit: boolean;
  onSaveText: (text: string) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);

  const save = () => {
    const clean = draft.trim();
    if (clean !== comment.text) onSaveText(clean);
    setEditing(false);
  };

  const showDeleteAction = draft.trim().length === 0 && attachments.length <= 1;

  if (editing) {
    return (
      <div className="space-y-1.5">
        <MentionInput value={draft} onChange={setDraft} onSubmit={save} rows={2} />
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((a) => (
              <AttachmentChip key={a.id} a={a} onRemove={() => onRemoveAttachment(a.id)} />
            ))}
          </div>
        )}
        <div className="flex gap-1.5 items-center">
          {showDeleteAction ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-6 px-2 text-xs rounded-md"
              onClick={() => { onDelete(); setEditing(false); }}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Excluir mensagem
            </Button>
          ) : (
            <Button size="sm" className="h-6 px-2 text-xs rounded-md bg-brand text-brand-foreground hover:bg-brand/90" onClick={save}>Salvar</Button>
          )}
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setDraft(comment.text); setEditing(false); }}>Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/comment">
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0 space-y-1.5">
          {comment.text && (
            <span className="block whitespace-pre-wrap break-words">{renderMentions(comment.text)}</span>
          )}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((a) => <AttachmentChip key={a.id} a={a} />)}
            </div>
          )}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => { setDraft(comment.text); setEditing(true); }}
            className="opacity-0 group-hover/comment:opacity-100 transition text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Editar mensagem"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
      {comment.editedAt && comment.editedBy && (
        <span className="text-[10px] text-muted-foreground italic">
          editada por {nameOf(comment.editedBy)}
        </span>
      )}
    </div>
  );
}
