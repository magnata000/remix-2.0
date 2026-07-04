import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, Play, Square } from "lucide-react";
import { SlaBadge } from "./SlaBadge";

type Props = {
  slaDueAt?: string;
  slaHours?: number;
  paused?: boolean;
  defaultHours?: number;
  onApply: (patch: { slaDueAt?: string; slaHours?: number }) => void;
};

/** Chip com semáforo + popover para iniciar/ajustar/parar o SLA do card. */
export function SlaControl({ slaDueAt, slaHours, paused, defaultHours, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState<string>(String(slaHours ?? defaultHours ?? 48));

  const start = () => {
    const n = Number(hours.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    const due = new Date(Date.now() + n * 3600_000).toISOString();
    onApply({ slaDueAt: due, slaHours: n });
    setOpen(false);
  };
  const clear = () => {
    onApply({ slaDueAt: undefined, slaHours: undefined });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-xs hover:bg-muted/70 transition"
        >
          {slaDueAt ? (
            <SlaBadge slaDueAt={slaDueAt} slaHours={slaHours} paused={paused} />
          ) : (
            <>
              <Clock className="h-3 w-3" /> Definir SLA
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <p className="text-xs font-semibold mb-2">SLA do card</p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0.5}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="h-8 rounded-lg bg-muted border-0"
          />
          <span className="text-xs text-muted-foreground">horas</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" className="rounded-lg h-8 flex-1 bg-brand text-brand-foreground hover:bg-brand/90" onClick={start}>
            <Play className="h-3 w-3 mr-1" /> {slaDueAt ? "Reiniciar" : "Iniciar"}
          </Button>
          {slaDueAt && (
            <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={clear}>
              <Square className="h-3 w-3" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Pausado automaticamente em etapas terminais.
        </p>
      </PopoverContent>
    </Popover>
  );
}
