import { useLayoutEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calculator, Calendar, FileText, Layers, Link2, Paperclip, Pin, Send, Tag, Trash2, Trophy, User, Wallet } from "lucide-react";
import { AudioRecorder } from "@/components/shared/AudioRecorder";
import { formatBRL, formatDateShort, lostReasonLabel, type KanbanStage } from "@/lib/mock/data";
import { usePipelineStore, stageLabels, type Opportunity } from "@/lib/pipeline/opportunityStore";
import { useQuoteStore } from "@/lib/multicalc/quoteStore";
import { MAX_PINNED_COMMENTS } from "@/lib/tasks/taskStore";
import { MentionInput } from "@/components/tasks/MentionInput";
import {
  CommentBubble,
  EDIT_WINDOW_MS,
  PendingChip,
  TimelineRow,
} from "@/components/shared/Timeline";

const stageColor: Record<KanbanStage, string> = {
  lead: "#0EA5E9",
  cotacao: "#D97706",
  negociacao: "#7C3AED",
  fechado: "#059669",
  perdido: "#DC2626",
};

type Props = {
  opportunity: Opportunity | null;
  onOpenChange: (v: boolean) => void;
  onOpenQuote?: (quoteGroupId?: string) => void;
  onDelete?: (opportunity: Opportunity) => void;
};

export function OpportunityDetailDialog({ opportunity, onOpenChange, onOpenQuote, onDelete }: Props) {
  const { addMessage, addAudioMessage, editComment, deleteComment, removeCommentAttachment, togglePinComment, currentUserId } = usePipelineStore();
  const { groups } = useQuoteStore();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (!opportunity) return;
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
  }, [opportunity?.id, opportunity?.timeline.length]);

  if (!opportunity) return null;
  const o = opportunity;
  const quote = o.quoteGroupId ? groups.find((g) => g.groupId === o.quoteGroupId) : undefined;

  const canSend = text.trim().length > 0 || pending.length > 0;
  const submit = () => {
    if (!canSend) return;
    addMessage(o.id, text, pending);
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
    <Dialog open={!!opportunity} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <span className="flex-1">{o.title}</span>
            <Badge variant="outline" className="rounded-full text-xs">{o.branch}</Badge>
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onDelete(o)}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                aria-label="Excluir oportunidade"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-[220px_1fr] gap-4 flex-1 overflow-hidden">
          <aside className="space-y-3 text-sm overflow-y-auto pr-2">
            <Meta icon={<Layers className="h-3.5 w-3.5" />} label="Etapa">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: stageColor[o.stage] }} />
                {stageLabels[o.stage]}
              </span>
            </Meta>
            <Meta icon={<User className="h-3.5 w-3.5" />} label="Responsável">
              <span className="inline-flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px] bg-brand-soft text-brand-foreground font-semibold">
                    {o.assignee}
                  </AvatarFallback>
                </Avatar>
                {o.assignee}
              </span>
            </Meta>
            <Meta icon={<Calendar className="h-3.5 w-3.5" />} label="Prazo">{formatDateShort(o.dueDate)}</Meta>
            <Meta icon={<Tag className="h-3.5 w-3.5" />} label="Cliente">{o.clientName}</Meta>
            <Meta icon={<Wallet className="h-3.5 w-3.5" />} label="Valor estimado">
              {o.estimatedValue > 0 ? formatBRL(o.estimatedValue) : "—"}
            </Meta>
            <Meta icon={<Calculator className="h-3.5 w-3.5" />} label="Cotação">
              {quote ? (
                <button
                  onClick={() => onOpenQuote?.(o.quoteGroupId)}
                  className="inline-flex items-center gap-1.5 text-brand hover:underline"
                >
                  <Link2 className="h-3 w-3" />
                  {quote.versions.length} {quote.versions.length === 1 ? "versão" : "versões"}
                  <Trophy className="h-3 w-3 ml-1" />
                  <span className="font-medium">v{quote.latest.version}</span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenQuote?.(undefined)}
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Calculator className="h-3 w-3" /> Cotar no Multicálculo
                </button>
              )}
            </Meta>
            {o.stage === "perdido" && o.lostReason && (
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Motivo da perda
                </p>
                <p className="mt-1 text-sm text-destructive">{lostReasonLabel[o.lostReason]}</p>
                {o.lostNote && (
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{o.lostNote}</p>
                )}
              </div>
            )}
          </aside>

          <section className="flex flex-col overflow-hidden min-h-0 border-l border-border pl-4">
            <h3 className="text-sm font-semibold mb-2">Timeline</h3>
            {(() => {
              const pinned = o.comments.filter((c) => c.pinned);
              if (pinned.length === 0) return null;
              const canPinMore = pinned.length < MAX_PINNED_COMMENTS;
              return (
                <div className="mb-3 rounded-xl border border-border bg-muted/40 p-2 space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Pin className="h-3 w-3" /> Fixadas ({pinned.length}/{MAX_PINNED_COMMENTS})
                  </p>
                  {pinned.map((c) => {
                    const atts = (c.attachmentIds ?? [])
                      .map((id) => o.attachments.find((a) => a.id === id))
                      .filter((a): a is NonNullable<typeof a> => !!a);
                    const within24h = Date.now() - new Date(c.createdAt).getTime() < EDIT_WINDOW_MS;
                    return (
                      <TimelineRow key={`pin-${c.id}`} authorId={c.authorId} at={c.createdAt}>
                        <CommentBubble
                          comment={c}
                          attachments={atts}
                          canEdit={c.authorId === currentUserId && within24h}
                          canDelete={c.authorId === currentUserId && within24h}
                          pinned
                          canPin={canPinMore}
                          onTogglePin={() => togglePinComment(o.id, c.id)}
                          onSaveText={(t) => editComment(o.id, c.id, t)}
                          onRemoveAttachment={(aid) => removeCommentAttachment(o.id, c.id, aid)}
                          onDelete={() => deleteComment(o.id, c.id)}
                        />
                      </TimelineRow>
                    );
                  })}
                </div>
              );
            })()}
            <div ref={timelineRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
              {o.timeline.map((ev, i) => {
                if (ev.kind === "created")
                  return (
                    <TimelineRow key={i} authorId={ev.by} at={ev.at}>
                      <em className="text-muted-foreground">criou a oportunidade</em>
                    </TimelineRow>
                  );
                if (ev.kind === "moved")
                  return (
                    <TimelineRow key={i} authorId={ev.by} at={ev.at}>
                      <em className="text-muted-foreground">
                        moveu de <strong>{ev.from}</strong> para <strong>{ev.to}</strong>
                      </em>
                    </TimelineRow>
                  );
                if (ev.kind === "comment") {
                  const c = o.comments.find((x) => x.id === ev.commentId);
                  if (!c) return null;
                  const atts = (c.attachmentIds ?? [])
                    .map((id) => o.attachments.find((a) => a.id === id))
                    .filter((a): a is NonNullable<typeof a> => !!a);
                  const within24h = Date.now() - new Date(c.createdAt).getTime() < EDIT_WINDOW_MS;
                  const pinnedCount = o.comments.filter((x) => x.pinned).length;
                  return (
                    <TimelineRow key={i} authorId={ev.by} at={ev.at}>
                      <CommentBubble
                        comment={c}
                        attachments={atts}
                        canEdit={c.authorId === currentUserId && within24h}
                        canDelete={c.authorId === currentUserId && within24h}
                        pinned={!!c.pinned}
                        canPin={pinnedCount < MAX_PINNED_COMMENTS}
                        onTogglePin={() => togglePinComment(o.id, c.id)}
                        onSaveText={(t) => editComment(o.id, c.id, t)}
                        onRemoveAttachment={(aid) => removeCommentAttachment(o.id, c.id, aid)}
                        onDelete={() => deleteComment(o.id, c.id)}
                      />
                    </TimelineRow>
                  );
                }
                if (ev.kind === "attachment") {
                  const a = o.attachments.find((x) => x.id === ev.attachmentId);
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
                <AudioRecorder compact onSend={(blob, sec) => addAudioMessage(o.id, blob, sec)} />
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
