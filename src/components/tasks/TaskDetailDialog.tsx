import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Paperclip, Send, Calendar, User, Users, Tag, Layers, FileText, Search, X, Pin } from "lucide-react";
import { formatDateShort } from "@/lib/mock/data";
import { MAX_PINNED_COMMENTS, PRIORITY_META, TaskAttachment, TaskItem, useTaskStore } from "@/lib/tasks/taskStore";
import { MentionInput } from "./MentionInput";
import {
  AttachmentChip,
  CommentBubble,
  EDIT_WINDOW_MS,
  PendingChip,
  TimelineRow,
  initialsOf,
  nameOf,
} from "@/components/shared/Timeline";


export function TaskDetailDialog({
  task,
  onOpenChange,
  initialSearch,
}: {
  task: TaskItem | null;
  onOpenChange: (v: boolean) => void;
  initialSearch?: string;
}) {
  const { columns, addMessage, editComment, removeCommentAttachment, deleteComment, togglePinComment, currentUserId } = useTaskStore();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task && initialSearch) {
      setSearchOpen(true);
      setSearchTerm(initialSearch);
    }
  }, [task?.id, initialSearch]);


  useLayoutEffect(() => {
    if (!task) return;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        const el = timelineRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      if (r2) cancelAnimationFrame(r2);
    };
  }, [task?.id, task?.timeline.length]);
  const fileInput = useRef<HTMLInputElement>(null);

  const column = useMemo(() => columns.find((c) => c.id === task?.columnId), [columns, task]);
  if (!task) return null;
  const pr = PRIORITY_META[task.priority];
  const pinnedComments = task.comments.filter((c) => c.pinned);
  const canPinMore = pinnedComments.length < MAX_PINNED_COMMENTS;
  const term = searchTerm.trim().toLowerCase();
  const matchesTerm = (c: { text: string; attachmentIds?: string[] }) => {
    if (!term) return true;
    if (c.text.toLowerCase().includes(term)) return true;
    const atts = (c.attachmentIds ?? [])
      .map((id) => task.attachments.find((a) => a.id === id))
      .filter((a): a is TaskAttachment => !!a);
    return atts.some((a) => a.name.toLowerCase().includes(term));
  };
  const attachmentMatches = (name: string) => !term || name.toLowerCase().includes(term);


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
                <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-brand-soft text-brand-foreground font-semibold">{task.assigneeId === "all" ? <Users className="h-3 w-3" /> : initialsOf(task.assigneeId)}</AvatarFallback></Avatar>
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Timeline</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setSearchTerm(""); }}
                aria-label="Buscar"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>
            {searchOpen && (
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar mensagem ou documento…"
                  className="h-8 pl-8 pr-8 rounded-lg text-xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpar busca"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {pinnedComments.length > 0 && (() => {
              const visiblePinned = pinnedComments.filter((c) => matchesTerm(c));
              if (visiblePinned.length === 0) return null;
              return (
                <div className="mb-3 rounded-xl border border-border bg-muted/40 p-2 space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Pin className="h-3 w-3" /> Fixadas ({pinnedComments.length}/{MAX_PINNED_COMMENTS})
                  </p>
                  {visiblePinned.map((c) => {
                    const atts = (c.attachmentIds ?? [])
                      .map((id) => task.attachments.find((a) => a.id === id))
                      .filter((a): a is TaskAttachment => !!a);
                    return (
                      <TimelineRow key={`pin-${c.id}`} authorId={c.authorId} at={c.createdAt}>
                        <CommentBubble
                          comment={c}
                          attachments={atts}
                          canEdit={c.authorId === currentUserId && Date.now() - new Date(c.createdAt).getTime() < EDIT_WINDOW_MS}
                          pinned
                          canPin
                          onTogglePin={() => togglePinComment(task.id, c.id)}
                          onSaveText={(t) => editComment(task.id, c.id, t)}
                          onRemoveAttachment={(aid) => removeCommentAttachment(task.id, c.id, aid)}
                          onDelete={() => deleteComment(task.id, c.id)}
                        />
                      </TimelineRow>
                    );
                  })}
                </div>
              );
            })()}

            <div ref={timelineRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
              {task.timeline.map((ev, i) => {
                if (term && (ev.kind === "created" || ev.kind === "moved")) return null;
                if (ev.kind === "created") return (<TimelineRow key={i} authorId={ev.by} at={ev.at}><em className="text-muted-foreground">criou a tarefa</em></TimelineRow>);
                if (ev.kind === "moved") return (<TimelineRow key={i} authorId={ev.by} at={ev.at}><em className="text-muted-foreground">moveu de <strong>{ev.from}</strong> para <strong>{ev.to}</strong></em></TimelineRow>);
                if (ev.kind === "comment") {
                  const c = task.comments.find((x) => x.id === ev.commentId);
                  if (!c) return null;
                  if (!matchesTerm(c)) return null;
                  const atts = (c.attachmentIds ?? [])
                    .map((id) => task.attachments.find((a) => a.id === id))
                    .filter((a): a is TaskAttachment => !!a);
                  return (
                    <TimelineRow key={i} authorId={ev.by} at={ev.at}>
                      <CommentBubble
                        comment={c}
                        attachments={atts}
                        canEdit={c.authorId === currentUserId && Date.now() - new Date(c.createdAt).getTime() < EDIT_WINDOW_MS}
                        pinned={!!c.pinned}
                        canPin={canPinMore}
                        onTogglePin={() => togglePinComment(task.id, c.id)}
                        onSaveText={(t) => editComment(task.id, c.id, t)}
                        onRemoveAttachment={(aid) => removeCommentAttachment(task.id, c.id, aid)}
                        onDelete={() => deleteComment(task.id, c.id)}
                      />
                    </TimelineRow>
                  );
                }
                if (ev.kind === "attachment") {
                  const a = task.attachments.find((x) => x.id === ev.attachmentId);
                  if (!a || !attachmentMatches(a.name)) return null;
                  return (
                    <TimelineRow key={i} authorId={ev.by} at={ev.at}>
                      <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand hover:underline">
                        <Paperclip className="h-3 w-3" />{a.name}
                      </a>
                    </TimelineRow>
                  );
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

