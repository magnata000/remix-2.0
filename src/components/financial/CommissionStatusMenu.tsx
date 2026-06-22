import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCommissionStore, type CommissionStatus } from "@/lib/financial/commissionStore";
import type { Commission } from "@/lib/mock/data";
import { toast } from "sonner";

const statusColor: Record<CommissionStatus, string> = {
  pago: "bg-success/15 text-success border-0",
  pendente: "bg-warning/15 text-warning border-0",
  atrasado: "bg-destructive/15 text-destructive border-0",
};

const STATUSES: CommissionStatus[] = ["pago", "pendente", "atrasado"];

type Props = { commission: Commission };

export function CommissionStatusMenu({ commission }: Props) {
  const { updateCommissionStatus } = useCommissionStore();

  const handleChange = (next: CommissionStatus) => {
    if (next === commission.status) return;
    updateCommissionStatus(commission.id, next);
    toast.success(`Status alterado para "${next}"`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          title="Clique para alterar o status"
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          <Badge className={`${statusColor[commission.status]} cursor-pointer hover:opacity-80 transition`}>
            {commission.status}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={(e) => {
              e.stopPropagation();
              handleChange(s);
            }}
            className="capitalize"
          >
            <Badge className={`${statusColor[s]} mr-2`}>{s}</Badge>
            {s === commission.status && <span className="text-xs text-muted-foreground ml-auto">atual</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
