import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, FileText, Image as ImageIcon, Pause, Pencil, Pin, PinOff, Play, Trash2, X } from "lucide-react";
import { team } from "@/lib/mock/data";
import type { TaskAttachment, TaskComment } from "@/lib/tasks/taskStore";
import { MESSAGE_PREVIEW_LIMIT } from "@/lib/tasks/taskStore";
import { MentionInput, renderMentions } from "@/components/tasks/MentionInput";



export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const initialsOf = (id: string) => {
  if (id === "all") return "TD";
  const m = team.find((x) => x.id === id);
  return m?.name.split(" ").map((p) => p[0]).slice(0, 2).join("") ?? "??";
};
export const nameOf = (id: string) =>
  id === "all" ? "Todos" : team.find((x) => x.id === id)?.name ?? "—";
const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};
const isImage = (type: string) => type.startsWith("image/");
const isAudio = (type: string) => type.startsWith("audio/");

/**
 * Player de áudio embutido estilo WhatsApp. Toca dentro da bolha sem abrir aba.
 * Pausa qualquer outro AudioBubble ao dar play (um por vez).
 */
function AudioBubble({ a, onRemove }: { a: TaskAttachment; onRemove?: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onOtherPlay = (ev: Event) => {
      if (ev.target !== el && !el.paused) {
        el.pause();
      }
    };
    document.addEventListener("play", onOtherPlay, true);
    return () => document.removeEventListener("play", onOtherPlay, true);
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !duration || !isFinite(duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
    setCurrent(el.currentTime);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  const shown = duration > 0 ? duration : current;
  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="inline-flex items-center gap-2 rounded-2xl bg-background border border-border pl-1.5 pr-2 py-1.5 max-w-[280px]">
      <audio
        ref={audioRef}
        src={a.url}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar áudio" : "Reproduzir áudio"}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-foreground hover:bg-brand/90 shrink-0"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>
      <div className="flex-1 min-w-[110px]">
        <div
          onClick={seek}
          className="h-1.5 rounded-full bg-muted cursor-pointer overflow-hidden"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div className="h-full bg-brand transition-[width] duration-100" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>{fmt(playing || current > 0 ? current : shown)}</span>
          <span>{formatBytes(a.size)}</span>
        </div>
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remover áudio" className="text-muted-foreground hover:text-destructive shrink-0">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function TimelineRow({
  authorId, at, children,
}: { authorId: string; at: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-[10px] bg-brand-soft text-brand-foreground font-semibold">
          {initialsOf(authorId)}
        </AvatarFallback>
      </Avatar>
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

export function PendingChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const previewUrl = useMemo(
    () => (isImage(file.type) ? URL.createObjectURL(file) : null),
    [file],
  );
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

export function AttachmentChip({ a, onRemove }: { a: TaskAttachment; onRemove?: () => void }) {
  if (isAudio(a.type)) return <AudioBubble a={a} onRemove={onRemove} />;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-background border border-border pl-1 pr-1.5 py-1 text-xs max-w-[220px]">
      <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground">

        {isImage(a.type) ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
      </span>
      <a href={a.url} target="_blank" rel="noreferrer" className="truncate flex-1 text-brand hover:underline" title={a.name}>
        {a.name}
      </a>
      <span className="text-[10px] text-muted-foreground">{formatBytes(a.size)}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remover anexo" className="text-muted-foreground hover:text-destructive">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function CommentBubble({
  comment, attachments, canEdit, canDelete, pinned, canPin, onTogglePin, onSaveText, onRemoveAttachment, onDelete,
}: {
  comment: TaskComment;
  attachments: TaskAttachment[];
  canEdit: boolean;
  canDelete?: boolean;
  pinned?: boolean;
  canPin?: boolean;
  onTogglePin?: () => void;
  onSaveText: (text: string) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const [expanded, setExpanded] = useState(false);
  const isLong = comment.text.length > MESSAGE_PREVIEW_LIMIT;
  const displayText = !isLong || expanded
    ? comment.text
    : comment.text.slice(0, MESSAGE_PREVIEW_LIMIT).trimEnd() + "…";


  const save = () => {
    const clean = draft.trim();
    if (clean !== comment.text) onSaveText(clean);
    setEditing(false);
  };

  const handleDelete = () => {
    if (typeof window !== "undefined" && !window.confirm("Excluir esta mensagem? Esta ação não pode ser desfeita.")) return;
    onDelete();
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
            <Button size="sm" variant="destructive" className="h-6 px-2 text-xs rounded-md"
              onClick={() => { onDelete(); setEditing(false); }}>
              <Trash2 className="h-3 w-3 mr-1" /> Excluir mensagem
            </Button>
          ) : (
            <Button size="sm" className="h-6 px-2 text-xs rounded-md bg-brand text-brand-foreground hover:bg-brand/90" onClick={save}>
              Salvar
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
            onClick={() => { setDraft(comment.text); setEditing(false); }}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/comment">
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0 space-y-1.5">
          {comment.text && (
            <span className="block whitespace-pre-wrap break-words">
              {renderMentions(displayText)}
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="ml-1 inline-flex items-center gap-0.5 text-[11px] text-brand hover:underline align-middle"
                  aria-label={expanded ? "Recolher mensagem" : "Expandir mensagem"}
                >
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {expanded ? "recolher" : "expandir"}
                </button>
              )}
            </span>
          )}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((a) => <AttachmentChip key={a.id} a={a} />)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              disabled={!pinned && canPin === false}
              title={pinned ? "Desafixar" : (canPin === false ? "Limite de 3 mensagens fixadas" : "Fixar mensagem")}
              aria-label={pinned ? "Desafixar mensagem" : "Fixar mensagem"}
              className={`transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${pinned ? "text-brand" : "opacity-0 group-hover/comment:opacity-100 text-muted-foreground hover:text-foreground"}`}
            >
              {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            </button>
          )}
          {canEdit && (
            <button type="button"
              onClick={() => { setDraft(comment.text); setEditing(true); }}
              className="opacity-0 group-hover/comment:opacity-100 transition text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Editar mensagem">
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {canDelete && (
            <button type="button"
              onClick={handleDelete}
              className="opacity-0 group-hover/comment:opacity-100 transition text-muted-foreground hover:text-destructive shrink-0"
              aria-label="Excluir mensagem"
              title="Excluir mensagem">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      {comment.editedAt && comment.editedBy && (
        <span className="text-[10px] text-muted-foreground italic">
          editada por {nameOf(comment.editedBy)}
        </span>
      )}
    </div>
  );
}

