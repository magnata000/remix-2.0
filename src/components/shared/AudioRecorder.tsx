import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

type Props = {
  onSend: (blob: Blob, durationSec: number) => void;
  maxSeconds?: number;
  compact?: boolean;
};

/**
 * Grava áudio via MediaRecorder. Estados: idle → recording → preview.
 * Chama onSend com Blob (audio/webm) e duração em segundos.
 */
export function AudioRecorder({ onSend, maxSeconds = 120, compact }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "preview">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Espelho do previewUrl para o cleanup do unmount ler o valor mais recente
  // sem que o effect precise re-executar a cada mudança de URL.
  const previewUrlRef = useRef<string | null>(null);
  previewUrlRef.current = previewUrl;

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
        setState("preview");
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recorderRef.current = rec;
      setElapsed(0);
      setState("recording");
      timerRef.current = window.setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= maxSeconds) {
            stop();
            return maxSeconds;
          }
          return e + 1;
        });
      }, 1000);
    } catch {
      toast.error("Habilite o microfone nas permissões do navegador");
    }
  };

  const stop = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.stop();
  };

  const cancel = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null);
    setPreviewUrl(null);
    setElapsed(0);
    setPlaying(false);
    setState("idle");
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  };

  const send = () => {
    if (!blob) return;
    onSend(blob, elapsed);
    cancel();
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (state === "idle") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={start}
        className={compact ? "h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" : "rounded-lg text-muted-foreground hover:text-foreground"}
        aria-label="Gravar áudio"
      >
        <Mic className="h-4 w-4" />
      </Button>
    );
  }

  if (state === "recording") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-2 py-1">
        <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-xs font-mono text-destructive">{fmt(elapsed)}</span>
        <Button type="button" size="icon" variant="ghost" onClick={stop} className="h-7 w-7" aria-label="Parar">
          <Square className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // preview
  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
      <audio ref={audioRef} src={previewUrl ?? undefined} onEnded={() => setPlaying(false)} />
      <Button type="button" size="icon" variant="ghost" onClick={togglePlay} className="h-7 w-7" aria-label="Reproduzir">
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <span className="text-xs font-mono">{fmt(elapsed)}</span>
      <Button type="button" size="icon" variant="ghost" onClick={cancel} className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label="Cancelar">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" size="icon" onClick={send} className="h-7 w-7 bg-brand text-brand-foreground hover:bg-brand/90" aria-label="Enviar áudio">
        <Send className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
