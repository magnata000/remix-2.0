import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Phone,
  Mail,
  IdCard,
  FileText,
  TrendingUp,
  KanbanSquare,
  Calculator,
  Plus,
  Sparkles,
  ArrowRight,
  Calendar,
} from "lucide-react";
import {
  policies,
  commissions,
  formatBRL,
  formatDateShort,
  type Policy,
  type PolicyStatus,
} from "@/lib/mock/data";
import { usePipelineStore } from "@/lib/pipeline/opportunityStore";
import { useQuoteStore } from "@/lib/multicalc/quoteStore";
import { useNavigation } from "@/lib/navigation";
import {
  getClientStats,
  initialsOf,
  type ClientStatus,
} from "@/lib/portfolio/clientStats";
import { NewOpportunityDialog } from "@/components/pipeline/NewOpportunityDialog";

const statusColor: Record<ClientStatus, string> = {
  ativo: "bg-success/15 text-success border-0",
  inativo: "bg-muted text-muted-foreground border-0",
  lead: "bg-info/15 text-info border-0",
};
const statusLabel: Record<ClientStatus, string> = {
  ativo: "Cliente ativo",
  inativo: "Cliente inativo",
  lead: "Lead",
};

const policyStatusColor: Record<PolicyStatus, string> = {
  ativa: "bg-success/15 text-success border-0",
  pendente: "bg-warning/15 text-warning border-0",
  vencida: "bg-destructive/15 text-destructive border-0",
  cancelada: "bg-muted text-muted-foreground border-0",
};

type Props = {
  clientName: string | null;
  onOpenChange: (open: boolean) => void;
  onOpenPolicy?: (policy: Policy) => void;
};

type TimelineEvent = {
  id: string;
  date: string;
  type: "policy" | "opportunity" | "quote" | "commission";
  title: string;
  meta: string;
};

export function ClientDetailDrawer({ clientName, onOpenChange, onOpenPolicy }: Props) {
  const { opportunities } = usePipelineStore();
  const { groups } = useQuoteStore();
  const { goTo } = useNavigation();
  const [newOpp, setNewOpp] = useState(false);

  const stats = useMemo(() => (clientName ? getClientStats(clientName) : null), [clientName]);

  const clientPolicies = useMemo(
    () => (clientName ? policies.filter((p) => p.clientName === clientName) : []),
    [clientName],
  );

  const clientOpps = useMemo(
    () =>
      clientName
        ? opportunities.filter(
            (o) => o.clientName === clientName && o.stage !== "fechado" && o.stage !== "perdido",
          )
        : [],
    [opportunities, clientName],
  );

  const clientGroups = useMemo(
    () => (clientName ? groups.filter((g) => g.clientName === clientName).slice(0, 5) : []),
    [groups, clientName],
  );

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!clientName) return [];
    const ev: TimelineEvent[] = [];
    clientPolicies.forEach((p) =>
      ev.push({
        id: `pol-${p.id}`,
        date: p.startDate,
        type: "policy",
        title: `Apólice ${p.number}`,
        meta: `${p.branch} • ${p.insurer}`,
      }),
    );
    opportunities
      .filter((o) => o.clientName === clientName)
      .forEach((o) =>
        ev.push({
          id: `opp-${o.id}`,
          date: o.dueDate,
          type: "opportunity",
          title: o.title,
          meta: `Oportunidade • ${o.stage}`,
        }),
      );
    groups
      .filter((g) => g.clientName === clientName)
      .forEach((g) =>
        ev.push({
          id: `q-${g.groupId}`,
          date: g.latest.createdAt.slice(0, 10),
          type: "quote",
          title: `Cotação ${g.branch}`,
          meta: `v${g.latest.version} • ${g.status}`,
        }),
      );
    commissions
      .filter((c) => c.clientName === clientName)
      .forEach((c) =>
        ev.push({
          id: `cm-${c.id}`,
          date: c.dueDate,
          type: "commission",
          title: `Comissão ${formatBRL(c.amount)}`,
          meta: `${c.insurer} • ${c.status}`,
        }),
      );
    return ev.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);
  }, [clientName, clientPolicies, opportunities, groups]);

  const open = !!clientName && !!stats;

  if (!stats) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent />
      </Sheet>
    );
  }

  const c = stats.client;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-brand-soft text-brand-foreground font-semibold">
                  {initialsOf(c.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-semibold">{c.name}</div>
                <Badge className={statusColor[stats.status]}>{statusLabel[stats.status]}</Badge>
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">Visão 360° do cliente</SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-6 mt-6 space-y-6">
            {/* Contato */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <ContactRow icon={Phone} value={c.phone} />
              <ContactRow icon={Mail} value={c.email} />
              <ContactRow icon={IdCard} value={c.document} />
            </section>

            {/* KPIs */}
            <section className="grid grid-cols-3 gap-3">
              <Kpi label="Apólices ativas" value={String(stats.activePolicies)} sub={`de ${stats.totalPolicies}`} />
              <Kpi label="Prêmio anual" value={formatBRL(stats.annualPremium)} sub="vigente" />
              <Kpi label="LTV estimado" value={formatBRL(stats.ltv)} sub="histórico" />
            </section>

            {/* Apólices vinculadas */}
            <Section title="Apólices vinculadas" count={clientPolicies.length} icon={FileText}>
              {clientPolicies.length === 0 ? (
                <Empty text="Nenhuma apólice vinculada" />
              ) : (
                <div className="space-y-2">
                  {clientPolicies.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onOpenPolicy?.(p)}
                      className="w-full text-left bg-card border border-border rounded-xl p-3 hover:border-brand transition flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{p.number}</span>
                          <Badge className={policyStatusColor[p.status]}>{p.status}</Badge>
                        </div>
                        <div className="text-sm font-medium mt-1">
                          {p.branch} • {p.insurer}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          até {formatDateShort(p.endDate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatBRL(p.premium)}</div>
                        <div className="text-xs text-muted-foreground">/ano</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Section>

            {/* Pipeline & cotações */}
            <Section title="Pipeline & cotações" count={clientOpps.length + clientGroups.length} icon={TrendingUp}>
              {clientOpps.length === 0 && clientGroups.length === 0 ? (
                <Empty text="Sem oportunidades ou cotações em aberto" />
              ) : (
                <div className="space-y-2">
                  {clientOpps.map((o) => (
                    <div
                      key={o.id}
                      className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
                    >
                      <KanbanSquare className="h-4 w-4 text-brand shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{o.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.branch} • {o.stage} • vence {formatDateShort(o.dueDate)}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{formatBRL(o.estimatedValue)}</div>
                    </div>
                  ))}
                  {clientGroups.map((g) => (
                    <div
                      key={g.groupId}
                      className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
                    >
                      <Calculator className="h-4 w-4 text-brand shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          Cotação {g.branch} <span className="text-muted-foreground">v{g.latest.version}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {g.status} • {formatDateShort(g.latest.createdAt.slice(0, 10))}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{formatBRL(g.latest.results[0]?.price ?? 0)}</div>
                    </div>
                  ))}
                </div>
              )}
              {clientOpps.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 text-xs rounded-lg"
                  onClick={() => {
                    onOpenChange(false);
                    goTo("kanban");
                  }}
                >
                  Abrir no Quadro <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </Section>

            {/* Timeline */}
            <Section title="Linha do tempo" count={timeline.length} icon={Sparkles}>
              {timeline.length === 0 ? (
                <Empty text="Sem atividade registrada" />
              ) : (
                <ol className="relative border-l border-border pl-4 space-y-3">
                  {timeline.map((ev) => (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[21px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-brand ring-4 ring-background" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{ev.title}</div>
                          <div className="text-xs text-muted-foreground">{ev.meta}</div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Calendar className="h-3 w-3" />
                          {formatDateShort(ev.date)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Section>

            {/* Footer actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                className="flex-1 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={() => setNewOpp(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> Nova oportunidade
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => {
                  onOpenChange(false);
                  goTo("multicalc");
                }}
              >
                <Calculator className="h-4 w-4 mr-1" /> Nova cotação
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <NewOpportunityDialog open={newOpp} onOpenChange={setNewOpp} defaultClientName={c.name} />
    </>
  );
}

function ContactRow({ icon: Icon, value }: { icon: typeof Phone; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs truncate">{value}</span>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function Section({
  title,
  count,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-4 text-center">
      {text}
    </div>
  );
}
