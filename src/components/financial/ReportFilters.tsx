import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarRange } from "lucide-react";
import type { DateRange } from "@/lib/financial/reportMetrics";
import { rangePreset } from "@/lib/financial/reportMetrics";

export type PeriodPreset = "mes" | "mes-anterior" | "ultimos-3" | "ano" | "ano-anterior" | "custom";

const PRESET_LABEL: Record<PeriodPreset, string> = {
  mes: "Este mês",
  "mes-anterior": "Mês anterior",
  "ultimos-3": "Últimos 3 meses",
  ano: "Este ano",
  "ano-anterior": "Ano anterior",
  custom: "Personalizado",
};

const toInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

type Props = {
  preset: PeriodPreset;
  range: DateRange;
  onChange: (preset: PeriodPreset, range: DateRange) => void;
};

export function ReportFilters({ preset, range, onChange }: Props) {
  const handlePreset = (p: PeriodPreset) => {
    if (p === "custom") {
      onChange(p, range);
      return;
    }
    onChange(p, rangePreset(p));
  };

  const handleDate = (which: "start" | "end", value: string) => {
    if (!value) return;
    const parts = value.split("-").map(Number);
    const d = new Date(
      parts[0],
      parts[1] - 1,
      parts[2],
      which === "end" ? 23 : 0,
      which === "end" ? 59 : 0,
      which === "end" ? 59 : 0,
    );
    onChange(
      "custom",
      which === "start" ? { start: d, end: range.end } : { start: range.start, end: d },
    );
  };

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="flex items-center gap-2 mr-2">
        <div className="h-9 w-9 rounded-full bg-brand-soft flex items-center justify-center">
          <CalendarRange className="h-4 w-4 text-brand-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Filtros</p>
          <p className="text-sm font-semibold">Período do relatório</p>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-1">Período</label>
        <Select value={preset} onValueChange={(v) => handlePreset(v as PeriodPreset)}>
          <SelectTrigger className="h-9 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PRESET_LABEL) as PeriodPreset[]).map((k) => (
              <SelectItem key={k} value={k}>
                {PRESET_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === "custom" && (
        <>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Início</label>
            <Input
              type="date"
              value={toInput(range.start)}
              onChange={(e) => handleDate("start", e.target.value)}
              className="h-9 w-40 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Fim</label>
            <Input
              type="date"
              value={toInput(range.end)}
              onChange={(e) => handleDate("end", e.target.value)}
              className="h-9 w-40 text-xs"
            />
          </div>
        </>
      )}

      <div className="flex items-end gap-2 opacity-60">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Conta bancária</label>
                <Select disabled value="all">
                  <SelectTrigger className="h-9 w-40 text-xs">
                    <SelectValue placeholder="Em breve" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Disponível quando contas bancárias forem cadastradas.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Centro de custo</label>
                <Select disabled value="all">
                  <SelectTrigger className="h-9 w-40 text-xs">
                    <SelectValue placeholder="Em breve" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Disponível quando centros de custo forem cadastrados.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
