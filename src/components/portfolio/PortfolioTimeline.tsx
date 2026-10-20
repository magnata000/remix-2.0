import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History } from "lucide-react";
import { listTimeline } from "@/lib/portfolio/portfolio.functions";
import { REASON_OPTIONS } from "@/lib/portfolio/policyStatus";
import { useTeam } from "@/lib/team/teamStore";

type Props = {
  entityType: "client" | "policy";
  entityId: string;
  /** Navegar para apólice relacionada (cadeia de renovação). */
  onOpenPolicy?: (policyId: string) => void;
};

const POLICY_LINK_EVENTS = new Set(["apolice_renovada", "apolice_criada"]);

export function PortfolioTimeline({ entityType, entityId, onOpenPolicy }: Props) {
  const fetchTimeline = useServerFn(listTimeline);
  const { members } = useTeam();
  const { data = [], isLoading } = useQuery({
    queryKey: ["timeline", entityType, entityId],
    queryFn: () => fetchTimeline({ data: { entityType, entityId } }),
  });

  if (isLoading)
    return <p className="text-xs text-muted-foreground py-6 text-center">Carregando…</p>;
  if (!data.length)
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mx-auto" />
        <p className="text-sm mt-2">Nenhum evento registrado ainda.</p>
      </div>
    );

  return (
    <ol className="relative border-l border-border ml-2 space-y-4">
      {data.map((ev) => {
        const author = ev.createdBy ? members.find((m) => m.id === ev.createdBy)?.name : "Sistema";
        const p = ev.payload;
        const reason =
          ev.eventType === "motivo_registrado" && p
            ? REASON_OPTIONS.find((o) => o.value === p["motivo"])?.label
            : undefined;
        const canNavigate =
          !!onOpenPolicy &&
          !!ev.relatedEntityId &&
          (entityType === "client"
            ? ev.eventType.startsWith("apolice") || ev.eventType === "motivo_registrado"
            : POLICY_LINK_EVENTS.has(ev.eventType));
        return (
          <li key={ev.id} className="ml-4">
            <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-brand" />
            <p className="text-sm font-medium">
              {canNavigate ? (
                <button
                  className="hover:text-brand hover:underline text-left"
                  onClick={() => onOpenPolicy!(ev.relatedEntityId!)}
                >
                  {ev.description}
                </button>
              ) : (
                ev.description
              )}
            </p>
            {reason && (
              <p className="text-xs mt-0.5">
                Motivo: <strong>{reason}</strong>
                {p?.["categoria_avulsa"] ? ` — ${String(p["categoria_avulsa"])}` : ""}
                {p?.["observacoes"] ? (
                  <span className="block text-muted-foreground">{String(p["observacoes"])}</span>
                ) : null}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(ev.createdAt).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
              {author ? ` • ${author}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
