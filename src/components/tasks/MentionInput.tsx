import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { team } from "@/lib/mock/data";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  rows?: number;
};

export function MentionInput({ value, onChange, onSubmit, placeholder, rows = 2 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hoverIndex, setHoverIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);

  const filtered = team.filter((m) => m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  useEffect(() => { if (!open) setHoverIndex(0); }, [open, query]);

  const handleChange = (v: string) => {
    onChange(v);
    const cursor = ref.current?.selectionStart ?? v.length;
    const before = v.slice(0, cursor);
    const at = before.lastIndexOf("@");
    if (at >= 0) {
      const between = before.slice(at + 1);
      if (!/\s/.test(between)) {
        setMentionStart(at);
        setQuery(between);
        setOpen(true);
        return;
      }
    }
    setOpen(false);
    setMentionStart(null);
  };

  const insertMention = (name: string) => {
    if (mentionStart == null) return;
    const cursor = ref.current?.selectionStart ?? value.length;
    const next = value.slice(0, mentionStart) + `@${name} ` + value.slice(cursor);
    onChange(next);
    setOpen(false);
    setMentionStart(null);
    setTimeout(() => ref.current?.focus(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && filtered.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHoverIndex((i) => (i + 1) % filtered.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHoverIndex((i) => (i - 1 + filtered.length) % filtered.length); return; }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); insertMention(filtered[hoverIndex].name); return; }
      if (e.key === "Escape") { setOpen(false); return; }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={rows}
        className="rounded-xl bg-muted border-0 resize-none"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-64 rounded-xl border border-border bg-popover shadow-lg p-1">
          {filtered.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onMouseEnter={() => setHoverIndex(i)}
              onClick={() => insertMention(m.name)}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
                i === hoverIndex ? "bg-muted" : ""
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand-foreground">
                {m.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </span>
              <span className="flex-1">{m.name}</span>
              <span className="text-[10px] text-muted-foreground">{m.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function renderMentions(text: string) {
  const parts = text.split(/(@[A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)?)/g);
  return parts.map((p, i) =>
    p.startsWith("@") && team.some((m) => `@${m.name}` === p)
      ? <strong key={i} className="text-brand font-semibold">{p}</strong>
      : <span key={i}>{p}</span>
  );
}
