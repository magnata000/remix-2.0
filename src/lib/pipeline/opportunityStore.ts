import { createContext, useContext, useState, useCallback, useMemo, ReactNode, createElement } from "react";
import { tasks as initialTasks, Task, KanbanStage, LostReason, Branch } from "@/lib/mock/data";

export type Opportunity = Task;

type Ctx = {
  opportunities: Opportunity[];
  byQuoteGroup: (groupId: string) => Opportunity | undefined;
  moveStage: (id: string, stage: KanbanStage, lostReason?: LostReason) => void;
  linkQuoteGroup: (opportunityId: string, quoteGroupId: string) => void;
  createFromQuote: (input: { clientName: string; branch: Branch; estimatedValue: number; quoteGroupId: string }) => Opportunity;
  createOpportunity: (input: { title: string; clientName: string; branch: Branch; estimatedValue: number; dueDate: string; assignee: string; stage: KanbanStage }) => Opportunity;
  setEstimatedValue: (id: string, value: number) => void;
};

const PipelineContext = createContext<Ctx | null>(null);

export function PipelineStoreProvider({ children }: { children: ReactNode }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() => initialTasks);

  const moveStage = useCallback((id: string, stage: KanbanStage, lostReason?: LostReason) => {
    setOpportunities((arr) => arr.map((t) =>
      t.id === id
        ? { ...t, stage, lostReason: stage === "perdido" ? (lostReason ?? t.lostReason) : undefined }
        : t
    ));
  }, []);

  const linkQuoteGroup = useCallback((opportunityId: string, quoteGroupId: string) => {
    setOpportunities((arr) => arr.map((t) => t.id === opportunityId ? { ...t, quoteGroupId } : t));
  }, []);

  const createFromQuote = useCallback((input: { clientName: string; branch: Branch; estimatedValue: number; quoteGroupId: string }) => {
    const id = `t${Date.now()}`;
    const due = new Date();
    due.setDate(due.getDate() + 7);
    const opp: Opportunity = {
      id,
      title: `Cotação ${input.branch} — ${input.clientName}`,
      clientName: input.clientName,
      branch: input.branch,
      estimatedValue: input.estimatedValue,
      dueDate: due.toISOString().slice(0, 10),
      assignee: "AS",
      stage: "cotacao",
      quoteGroupId: input.quoteGroupId,
    };
    setOpportunities((arr) => [opp, ...arr]);
    return opp;
  }, []);

  const setEstimatedValue = useCallback((id: string, value: number) => {
    setOpportunities((arr) => arr.map((t) => t.id === id ? { ...t, estimatedValue: value } : t));
  }, []);

  const indexByGroup = useMemo(() => {
    const m = new Map<string, Opportunity>();
    opportunities.forEach((o) => { if (o.quoteGroupId) m.set(o.quoteGroupId, o); });
    return m;
  }, [opportunities]);

  const byQuoteGroup = useCallback((groupId: string) => indexByGroup.get(groupId), [indexByGroup]);

  const value: Ctx = { opportunities, byQuoteGroup, moveStage, linkQuoteGroup, createFromQuote, setEstimatedValue };
  return createElement(PipelineContext.Provider, { value }, children);
}

export function usePipelineStore() {
  const c = useContext(PipelineContext);
  if (!c) throw new Error("usePipelineStore must be used within PipelineStoreProvider");
  return c;
}

export const stageLabels: Record<KanbanStage, string> = {
  lead: "Lead",
  cotacao: "Cotação",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};
