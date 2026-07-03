import { Clock } from "lucide-react";
import { computeSlaStatus, type SlaStatus } from "@/lib/sla/slaConfig";
import { cn } from "@/lib/utils";

type Props = {
  slaDueAt?: string;
  slaHours?: number;
  paused?: boolean;
  compact?: boolean;
};

const COLORS: Record<Exclude<SlaStatus, "none">, string> = {
  green: "bg-success/15 text-success",
  yellow: "bg-warning/15 text-warning",
  red: "bg-destructive/15 text-destructive",
};

export function SlaBadge({ slaDueAt, slaHours, paused, compact }: Props) {
  const { status, label } = computeSlaStatus(slaDueAt, slaHours, !!paused);
  if (status === "none") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        COLORS[status],
        compact && "text-[9px] px-1.5",
      )}
      title={`SLA: ${label}`}
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}

export function slaBorderClass(status: SlaStatus) {
  if (status === "red") return "border-l-[3px] border-l-destructive";
  if (status === "yellow") return "border-l-[3px] border-l-warning";
  if (status === "green") return "border-l-[3px] border-l-success";
  return "";
}
