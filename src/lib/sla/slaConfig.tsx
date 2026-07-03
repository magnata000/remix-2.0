import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { KanbanStage } from "@/lib/mock/data";

/**
 * Configuração global de SLA por coluna (Tarefas) e por etapa (Pipeline).
 * Valores em HORAS. undefined = sem SLA padrão.
 */
type Ctx = {
  taskColumnHours: Record<string, number | undefined>;
  pipelineStageHours: Record<KanbanStage, number | undefined>;
  setTaskColumnHours: (id: string, hours: number | undefined) => void;
  setPipelineStageHours: (stage: KanbanStage, hours: number | undefined) => void;
};

const DEFAULT_STAGE: Record<KanbanStage, number | undefined> = {
  lead: 48,
  cotacao: 72,
  negociacao: 120,
  fechado: undefined,
  perdido: undefined,
};

const DEFAULT_TASK: Record<string, number | undefined> = {
  "c-demanda": 48,
  "c-processando": 72,
  "c-concluido": undefined,
};

const SlaCtx = createContext<Ctx | null>(null);

export function SlaConfigProvider({ children }: { children: ReactNode }) {
  const [taskColumnHours, setTaskCols] = useState<Record<string, number | undefined>>(DEFAULT_TASK);
  const [pipelineStageHours, setStages] = useState<Record<KanbanStage, number | undefined>>(DEFAULT_STAGE);

  const setTaskColumnHours = useCallback((id: string, hours: number | undefined) => {
    setTaskCols((r) => ({ ...r, [id]: hours }));
  }, []);
  const setPipelineStageHours = useCallback((stage: KanbanStage, hours: number | undefined) => {
    setStages((r) => ({ ...r, [stage]: hours }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({ taskColumnHours, pipelineStageHours, setTaskColumnHours, setPipelineStageHours }),
    [taskColumnHours, pipelineStageHours, setTaskColumnHours, setPipelineStageHours],
  );

  return <SlaCtx.Provider value={value}>{children}</SlaCtx.Provider>;
}

export function useSlaConfig() {
  const c = useContext(SlaCtx);
  if (!c) throw new Error("useSlaConfig must be used within SlaConfigProvider");
  return c;
}

/** Terminal columns/stages não têm SLA ativo. */
export const TERMINAL_STAGES: KanbanStage[] = ["fechado", "perdido"];
export function isTerminalTaskColumnTitle(title?: string) {
  if (!title) return false;
  const t = title.toLowerCase();
  return t.includes("conclu") || t.includes("finaliz") || t.includes("done");
}

export type SlaStatus = "green" | "yellow" | "red" | "none";

export function computeSlaStatus(
  slaDueAt: string | undefined,
  slaHours: number | undefined,
  paused: boolean,
): { status: SlaStatus; remainingMs: number; label: string } {
  if (!slaDueAt || paused) return { status: "none", remainingMs: 0, label: "" };
  const due = new Date(slaDueAt).getTime();
  const now = Date.now();
  const remainingMs = due - now;
  const totalMs = (slaHours ?? 48) * 3600_000;
  const pct = remainingMs / totalMs;
  let status: SlaStatus = "green";
  if (remainingMs <= 0) status = "red";
  else if (pct <= 0.5) status = "yellow";
  const label = formatRemaining(remainingMs);
  return { status, remainingMs, label };
}

function formatRemaining(ms: number) {
  const abs = Math.abs(ms);
  const mins = Math.floor(abs / 60_000);
  const days = Math.floor(mins / (60 * 24));
  const hours = Math.floor((mins % (60 * 24)) / 60);
  const restMin = mins % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (!days && restMin) parts.push(`${restMin}min`);
  const txt = parts.join(" ") || "menos de 1min";
  return ms < 0 ? `Vencido há ${txt}` : txt;
}
