import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { team } from "@/lib/mock/data";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  rows?: number;
  className?: string;
};

type MentionOption = { id: string; name: string; role: string };

const ALL_OPTION: MentionOption = { id: "__all__", name: "Todos", role: "Toda a corretora" };
const KNOWN_NAMES = new Set<string>(["Todos", ...team.map((m) => m.name)]);

function extractMentioned(text: string): Set<string> {
  const set = new Set<string>();
  const re = /@([A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)?)(?=\s|$|[.,;:!?])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (KNOWN_NAMES.has(m[1])) set.add(m[1]);
    else {
      const first = m[1].split(" ")[0];
      if (KNOWN_NAMES.has(first)) set.add(first);
    }
  }
  return set;
}

export function MentionInput({ value, onChange, onSubmit, placeholder, rows = 2, className }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hoverIndex, setHoverIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<number>(0);

  const mentionedNames = useMemo(() => {
    const scan = mentionStart != null
      ? value.slice(0, mentionStart) + value.slice(cursorPos)
      : value;
    return extractMentioned(scan);
  }, [value, mentionStart, cursorPos]);

  const hasAll = mentionedNames.has("Todos");
  const baseOptions: MentionOption[] = useMemo(
    () => [ALL_OPTION, ...team.map((t) => ({ id: t.id, name: t.name, role: t.role }))],
    []
  );
  const options = useMemo(
    () =>
      baseOptions
        .filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
        .filter((o) => (hasAll ? false : !mentionedNames.has(o.name)))
        .slice(0, 6),
    [baseOptions, query, hasAll, mentionedNames]
  );

  useEffect(() => { if (!open) setHoverIndex(0); }, [open, query]);
  useEffect(() => { if (hoverIndex >= options.length) setHoverIndex(0); }, [options.length, hoverIndex]);

  const [pos, setPos] = useState<{ left: number; bottom: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({
        left: rect.left,
        bottom: window.innerHeight - rect.top + 8,
        width: Math.max(rect.width, 256),
      });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open, options.length, value]);

  const handleChange = (v: string) => {
    onChange(v);
    const cursor = ref.current?.selectionStart ?? v.length;
    setCursorPos(cursor);
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
    const insert = `@${name} `;
    const next = value.slice(0, mentionStart) + insert + value.slice(cursor);
    const caret = mentionStart + insert.length;
    onChange(next);
    setOpen(false);
    setMentionStart(null);
    setTimeout(() => {
      const node = ref.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    }, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && options.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHoverIndex((i) => (i + 1) % options.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHoverIndex((i) => (i - 1 + options.length) % options.length); return; }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); insertMention(options[hoverIndex].name); return; }
      if (e.key === "Escape") { setOpen(false); return; }
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const el = ref.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const next = value.slice(0, start) + "\n" + value.slice(end);
      onChange(next);
      setTimeout(() => {
        if (el) {
          el.focus();
          el.selectionStart = el.selectionEnd = start + 1;
        }
      }, 0);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
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
        onKeyUp={() => setCursorPos(ref.current?.selectionStart ?? 0)}
        onClick={() => setCursorPos(ref.current?.selectionStart ?? 0)}
        placeholder={placeholder}
        rows={rows}
        className={className ?? "rounded-xl bg-muted border-0 resize-none"}
      />
      {open && pos && createPortal(
        <div
          style={{ position: "fixed", left: pos.left, bottom: pos.bottom, width: pos.width, maxWidth: "min(20rem, 90vw)" }}
          className="z-[100] rounded-xl border border-border bg-popover/95 backdrop-blur-sm shadow-xl ring-1 ring-border/50 p-1 max-h-[60vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {options.length > 0 ? (
            options.map((o, i) => {
              const isAll = o.id === "__all__";
              return (
                <button
                  key={o.id}
                  type="button"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseDown={(e) => { e.preventDefault(); insertMention(o.name); }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    i === hoverIndex ? "bg-muted" : "hover:bg-muted/80"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                      isAll ? "bg-brand text-primary-foreground" : "bg-brand-soft text-brand-foreground"
                    }`}
                  >
                    {isAll ? <Users className="h-3.5 w-3.5" /> : o.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <span className={`flex-1 ${isAll ? "font-semibold" : ""}`}>{o.name}</span>
                  <span className="text-[10px] text-muted-foreground">{o.role}</span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {hasAll || mentionedNames.size > 0 ? "Nenhuma menção disponível" : "Nenhum colaborador encontrado"}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export function renderMentions(text: string) {
  const parts = text.split(/(@[A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)?)/g);
  return parts.map((p, i) =>
    p.startsWith("@") && KNOWN_NAMES.has(p.slice(1))
      ? <strong key={i} className="text-brand font-semibold">{p}</strong>
      : <span key={i}>{p}</span>
  );
}
