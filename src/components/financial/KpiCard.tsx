import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowDown, ArrowUp, Info, Minus } from "lucide-react";
import { formatPct } from "@/lib/financial/reportMetrics";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: string;
  hint?: string;
  deltaPct?: number;
  trend?: "up" | "down" | "flat";
  invertTrendColor?: boolean; // ex.: inadimplência: subir é ruim
  loading?: boolean;
  footer?: React.ReactNode;
};

export function KpiCard({
  title,
  value,
  hint,
  deltaPct,
  trend,
  invertTrendColor,
  loading,
  footer,
}: Props) {
  const good = invertTrendColor ? trend === "down" : trend === "up";
  const bad = invertTrendColor ? trend === "up" : trend === "down";
  const color =
    trend === "flat"
      ? "text-muted-foreground"
      : good
        ? "text-success"
        : bad
          ? "text-destructive"
          : "text-muted-foreground";
  const Icon = trend === "flat" ? Minus : trend === "up" ? ArrowUp : ArrowDown;

  return (
    <Card className="p-5 rounded-2xl border-border shadow-none h-full flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        {hint && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Informação"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] text-xs">{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      )}
      {typeof deltaPct === "number" && !loading && (
        <div className={cn("mt-2 inline-flex items-center gap-1 text-xs font-medium", color)}>
          <Icon className="h-3.5 w-3.5" />
          <span>{formatPct(Math.abs(deltaPct))}</span>
          <span className="text-muted-foreground font-normal">vs. período anterior</span>
        </div>
      )}
      {footer && <div className="mt-3 text-xs text-muted-foreground">{footer}</div>}
    </Card>
  );
}
