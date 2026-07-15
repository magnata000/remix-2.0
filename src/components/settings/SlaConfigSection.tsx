import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer } from "lucide-react";
import { useSlaConfig } from "@/lib/sla/slaConfig";
import { stageLabels } from "@/lib/pipeline/opportunityStore";
import { useTaskStore } from "@/lib/tasks/taskStore";
import type { KanbanStage } from "@/lib/mock/data";

const PIPELINE_STAGES: KanbanStage[] = ["lead", "cotacao", "negociacao"];

export function SlaConfigSection() {
  const { taskColumnHours, pipelineStageHours, setTaskColumnHours, setPipelineStageHours } =
    useSlaConfig();
  const { columns } = useTaskStore();

  return (
    <Card className="p-5 rounded-2xl border-border shadow-none">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-brand-soft flex items-center justify-center">
          <Timer className="h-5 w-5 text-brand-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">SLA — prazos padrão</h2>
          <p className="text-xs text-muted-foreground">
            Defina em horas o SLA padrão de cada etapa do Pipeline e coluna de Tarefas. Etapas
            terminais (Fechado, Perdido, Concluído) não têm SLA ativo.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Pipeline de Vendas</h3>
          <div className="space-y-3">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage} className="flex items-center justify-between gap-3">
                <Label className="text-sm">{stageLabels[stage]}</Label>
                <HoursInput
                  value={pipelineStageHours[stage]}
                  onChange={(v) => setPipelineStageHours(stage, v)}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Tarefas — por coluna</h3>
          <div className="space-y-3">
            {columns.map((col) => {
              const terminal = /conclu|finaliz|done/i.test(col.title);
              return (
                <div key={col.id} className="flex items-center justify-between gap-3">
                  <Label className="text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                    {col.title}
                  </Label>
                  {terminal ? (
                    <span className="text-xs text-muted-foreground">terminal</span>
                  ) : (
                    <HoursInput
                      value={taskColumnHours[col.id]}
                      onChange={(v) => setTaskColumnHours(col.id, v)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function HoursInput({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        step={1}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (raw === "") return onChange(undefined);
          const n = Number(raw);
          if (!Number.isFinite(n) || n < 0) return;
          onChange(n);
        }}
        placeholder="—"
        className="w-24 rounded-lg bg-muted border-0 text-right"
      />
      <span className="text-xs text-muted-foreground w-8">horas</span>
    </div>
  );
}
