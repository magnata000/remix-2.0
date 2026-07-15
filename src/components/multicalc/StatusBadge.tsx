import { Badge } from "@/components/ui/badge";
import { QuoteStatus } from "@/lib/multicalc/quoteStore";
import { CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";

const map: Record<QuoteStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  aberto: { label: "Em aberto", cls: "bg-info/15 text-info border-info/30", Icon: Clock },
  ganha: {
    label: "Ganha",
    cls: "bg-success/15 text-success border-success/30",
    Icon: CheckCircle2,
  },
  perdida: {
    label: "Perdida",
    cls: "bg-destructive/15 text-destructive border-destructive/30",
    Icon: XCircle,
  },
  expirada: {
    label: "Expirada",
    cls: "bg-warning/15 text-warning-foreground border-warning/40",
    Icon: AlertTriangle,
  },
};

export function StatusBadge({ status }: { status: QuoteStatus }) {
  const { label, cls, Icon } = map[status];
  return (
    <Badge variant="outline" className={`${cls} gap-1 font-medium`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
