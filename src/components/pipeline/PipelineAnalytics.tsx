import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingDown, TrendingUp, Trophy, AlertTriangle, Target, DollarSign, Users } from "lucide-react";
import { formatBRL, team } from "@/lib/mock/data";
import { usePipelineStore } from "@/lib/pipeline/opportunityStore";
import { computePipelineAnalytics, formatHours, STAGE_ORDER } from "@/lib/pipeline/salesStats";
import { stageLabels } from "@/lib/pipeline/opportunityStore";

type Props = { onBack: () => void };
type Period = "30" | "90" | "365" | "all";

export function PipelineAnalytics({ onBack }: Props) {
  const { opportunities } = usePipelineStore();
  const [period, setPeriod] = useState<Period>("90");
  const [assignee, setAssignee] = useState<string>("all");

  const analytics = useMemo(() => {
    const now = new Date();
    let from: Date | undefined;
    if (period !== "all") {
      from = new Date();
      from.setDate(from.getDate() - Number(period));
    }
    return computePipelineAnalytics(opportunities, {
      from,
      to: now,
      assignee: assignee === "all" ? undefined : assignee,
    });
  }, [opportunities, period, assignee]);

  const maxPassed = Math.max(...analytics.stages.filter((s) => s.stage !== "perdido").map((s) => s.totalPassed), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={onBack} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Estatísticas do Pipeline</h2>
            <p className="text-xs text-muted-foreground">Análise de conversão, gargalos e perdas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-40 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger className="w-48 rounded-xl bg-muted border-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {team.map((m) => <SelectItem key={m.id} value={m.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          icon={<Target className="h-4 w-4" />}
          label="Conversão total"
          value={`${(analytics.overallConversion * 100).toFixed(1)}%`}
          hint={`${analytics.won} ganhos de ${analytics.totalCreated}`}
        />
        <Kpi
          icon={<DollarSign className="h-4 w-4" />}
          label="Ticket médio"
          value={formatBRL(analytics.avgTicket)}
          hint={`Receita: ${formatBRL(analytics.wonRevenue)}`}
        />
        <Kpi
          icon={<Trophy className="h-4 w-4 text-success" />}
          label="Ganhos"
          value={String(analytics.won)}
          hint={`${analytics.uniqueClientsWon} clientes únicos`}
        />
        <Kpi
          icon={<TrendingDown className="h-4 w-4 text-destructive" />}
          label="Perdidos"
          value={String(analytics.lost)}
          hint={formatBRL(analytics.lostRevenue) + " perdidos"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {analytics.bottleneckStage && (
          <Card className="p-4 rounded-2xl border-warning/40 bg-warning/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Maior gargalo</p>
                <p className="font-semibold">{stageLabels[analytics.bottleneckStage]}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo médio: {formatHours(analytics.stages.find((s) => s.stage === analytics.bottleneckStage)!.avgHoursInStage)}
                </p>
              </div>
            </div>
          </Card>
        )}
        {analytics.worstLossStage && (
          <Card className="p-4 rounded-2xl border-destructive/40 bg-destructive/5">
            <div className="flex items-start gap-3">
              <TrendingDown className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Etapa com maior perda</p>
                <p className="font-semibold">{stageLabels[analytics.worstLossStage]}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.stages.find((s) => s.stage === analytics.worstLossStage)!.lostFromHere} leads perdidos aqui
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Funil */}
      <Card className="p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-brand" />
          <h3 className="font-semibold text-sm">Funil de conversão</h3>
        </div>
        <div className="space-y-2">
          {STAGE_ORDER.filter((s) => s !== "perdido").map((stage) => {
            const st = analytics.stages.find((x) => x.stage === stage)!;
            const width = (st.totalPassed / maxPassed) * 100;
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-xs font-medium w-24 shrink-0">{stageLabels[stage]}</span>
                <div className="flex-1 bg-muted rounded-lg h-8 relative overflow-hidden">
                  <div
                    className="h-full bg-brand/70 rounded-lg transition-all flex items-center justify-end px-2"
                    style={{ width: `${Math.max(width, 4)}%` }}
                  >
                    <span className="text-[10px] font-bold text-brand-foreground">
                      {st.totalPassed}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                  {formatHours(st.avgHoursInStage)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Conversão etapa → etapa */}
      <Card className="p-5 rounded-2xl">
        <h3 className="font-semibold text-sm mb-4">Conversão entre etapas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {analytics.stageToStage.map((s) => (
            <div key={`${s.from}-${s.to}`} className="rounded-xl bg-muted p-3">
              <p className="text-[11px] text-muted-foreground">
                {stageLabels[s.from]} → {stageLabels[s.to]}
              </p>
              <p className="text-2xl font-bold mt-1">{(s.rate * 100).toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabela por etapa */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                <th className="px-5 py-3 font-medium">Etapa</th>
                <th className="px-5 py-3 font-medium">Atuais</th>
                <th className="px-5 py-3 font-medium">Já passaram</th>
                <th className="px-5 py-3 font-medium">Tempo médio</th>
                <th className="px-5 py-3 font-medium">Avançou</th>
                <th className="px-5 py-3 font-medium">Perdeu</th>
              </tr>
            </thead>
            <tbody>
              {analytics.stages.map((s) => (
                <tr key={s.stage} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">{stageLabels[s.stage]}</td>
                  <td className="px-5 py-3">{s.currentCount}</td>
                  <td className="px-5 py-3 text-muted-foreground">{s.totalPassed}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatHours(s.avgHoursInStage)}</td>
                  <td className="px-5 py-3 text-success">{s.advancedFromHere}</td>
                  <td className="px-5 py-3 text-destructive">{s.lostFromHere}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Motivos de perda */}
      <Card className="p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-destructive" />
          <h3 className="font-semibold text-sm">Principais motivos de perda</h3>
        </div>
        {analytics.lossReasons.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma perda registrada no período.</p>
        ) : (
          <div className="space-y-2">
            {analytics.lossReasons.slice(0, 5).map((r) => {
              const pct = (r.count / analytics.lost) * 100;
              return (
                <div key={r.reason} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-28 shrink-0">{r.reason}</span>
                  <div className="flex-1 bg-muted rounded-lg h-6 overflow-hidden">
                    <div
                      className="h-full bg-destructive/70 rounded-lg flex items-center justify-end px-2"
                      style={{ width: `${Math.max(pct, 6)}%` }}
                    >
                      <span className="text-[10px] font-bold text-destructive-foreground">{r.count}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full text-[10px] shrink-0">{pct.toFixed(0)}%</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4 rounded-2xl">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </Card>
  );
}
