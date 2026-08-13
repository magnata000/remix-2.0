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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Mail,
  IdCard,
  FileText,
  Calculator,
  Plus,
  Search,
  FolderOpen,
  Cake,
  Pencil,
  History,
  MessageCircle,
  Users,
  Video,
  StickyNote,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EditClientDialog } from "@/components/portfolio/EditClientDialog";
import { FollowUpDialog } from "@/components/portfolio/FollowUpDialog";
import { formatBRL, formatDateShort, type Policy, type PolicyStatus } from "@/lib/mock/data";
import { useClients } from "@/lib/portfolio/clientStore";
import { useFollowUps } from "@/lib/portfolio/followUpStore";
import { usePolicies } from "@/lib/portfolio/policyStore";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { useNavigation } from "@/lib/navigation";
import { getClientStats, initialsOf, type ClientStatus } from "@/lib/portfolio/clientStats";
import type { FollowUp, FollowUpStatus, FollowUpType } from "@/lib/mock/data";
import { toast } from "sonner";

import { useDocumentStore, formatFileSize } from "@/lib/documents/documentStore";
import { FolderTree } from "@/components/documents/FolderTree";
import { NewOpportunityDialog } from "@/components/pipeline/NewOpportunityDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  renovada: "bg-info/15 text-info border-0",
};

type Props = {
  clientName: string | null;
  onOpenChange: (open: boolean) => void;
  onOpenPolicy?: (policy: Policy) => void;
};

export function ClientDetailDrawer({ clientName, onOpenChange, onOpenPolicy }: Props) {
  const { clients } = useClients();
  const { policies } = usePolicies();
  const { commissions } = useCommissionStore();
  const { followUps, listByClient, changeStatus, deleteFollowUp } = useFollowUps();
  const { goTo } = useNavigation();
  const docStore = useDocumentStore();
  const [newOpp, setNewOpp] = useState(false);
  const docCount = clientName ? docStore.countByClient(clientName) : 0;
  const [editOpen, setEditOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);

  const stats = useMemo(
    () => (clientName ? getClientStats(clientName, clients, policies, commissions) : null),
    [clientName, clients, policies, commissions],
  );

  const clientPolicies = useMemo(
    () => (clientName ? policies.filter((p) => p.clientName === clientName) : []),
    [policies, clientName],
  );

  const c = stats?.client;
  const clientFollowUpsPre = useMemo(
    () => (c ? listByClient(c.id) : []),
    [c, listByClient, followUps],
  );

  const open = !!clientName && !!stats;

  if (!stats || !c) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent />
      </Sheet>
    );
  }

  const clientFollowUps = clientFollowUpsPre;

  const openNewFollowUp = () => {
    setEditingFollowUp(null);
    setFollowUpOpen(true);
  };

  const openEditFollowUp = (f: FollowUp) => {
    setEditingFollowUp(f);
    setFollowUpOpen(true);
  };

  const onDeleteFollowUp = (id: string) => {
    deleteFollowUp(id);
    toast.success("Follow-up removido");
  };

  const onStatusChange = (id: string, s: FollowUpStatus) => {
    changeStatus(id, s);
    toast.success("Status atualizado");
  };

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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground mr-8"
                      onClick={() => setEditOpen(true)}
                      aria-label="Editar dados"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar dados</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </SheetTitle>
            <SheetDescription className="sr-only">Visão 360° do cliente</SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="overview" className="px-4 mt-6">
            <TabsList className="rounded-xl bg-muted">
              <TabsTrigger value="overview" className="rounded-lg">
                Visão geral
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-lg">
                Documentos
                <span className="ml-1.5 text-xs text-muted-foreground">({docCount})</span>
              </TabsTrigger>
              <TabsTrigger value="followups" className="rounded-lg">
                Follow-ups
                <span className="ml-1.5 text-xs text-muted-foreground">({clientFollowUps.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-5 pb-6 space-y-6">
              {/* Contato */}
              <section className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <ContactRow icon={Phone} value={c.phone} />
                <ContactRow icon={Mail} value={c.email} />
                <ContactRow icon={IdCard} value={c.document} />
                {c.birthDate && (
                  <ContactRow
                    icon={Cake}
                    value={formatDateShort(c.birthDate)}
                    aside={`${calcAge(c.birthDate)} anos`}
                  />
                )}
              </section>

              {/* KPIs */}
              <section className="grid grid-cols-3 gap-3">
                <Kpi
                  label="Apólices ativas"
                  value={String(stats.activePolicies)}
                  sub={`de ${stats.totalPolicies}`}
                />
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
                            <span className="font-mono text-xs text-muted-foreground">
                              {p.number}
                            </span>
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
            </TabsContent>

            <TabsContent value="documents" className="mt-5 pb-6">
              <ClientDocumentsPanel clientName={c.name} />
            </TabsContent>

            <TabsContent value="followups" className="mt-5 pb-6">
              <ClientFollowUpsPanel
                client={c}
                followUps={clientFollowUps}
                onNew={openNewFollowUp}
                onEdit={openEditFollowUp}
                onDelete={onDeleteFollowUp}
                onStatusChange={onStatusChange}
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <NewOpportunityDialog open={newOpp} onOpenChange={setNewOpp} defaultClientName={c.name} />
      <EditClientDialog open={editOpen} onOpenChange={setEditOpen} client={c} />
      <FollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        followUp={editingFollowUp}
        defaultClient={c}
      />
    </>
  );
}

function ClientDocumentsPanel({ clientName }: { clientName: string }) {
  const docStore = useDocumentStore();
  const [query, setQuery] = useState("");
  const roots = useMemo(() => docStore.rootFoldersByClient(clientName), [docStore, clientName]);
  const hits = useMemo(
    () => docStore.searchFilesByClient(clientName, query),
    [docStore, clientName, query],
  );
  const searching = query.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar arquivos do cliente..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 rounded-xl bg-muted border-0"
        />
      </div>

      {searching ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-muted/40 text-xs text-muted-foreground">
            {hits.length === 0
              ? "Nenhum arquivo encontrado"
              : `${hits.length} resultado${hits.length === 1 ? "" : "s"}`}
          </div>
          {hits.length > 0 && (
            <ul className="divide-y divide-border max-h-[420px] overflow-y-auto">
              {hits.map(({ file, folder, rootFolder }) => (
                <li key={file.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      <FolderOpen className="h-3 w-3 shrink-0" />
                      {rootFolder.name}
                      {folder.id !== rootFolder.id && <> / {folder.name}</>}
                      <span className="mx-1">•</span>
                      {formatFileSize(file.sizeKB)}
                      <span className="mx-1">•</span>
                      {formatDateShort(file.uploadedAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : roots.length === 0 ? (
        <Empty text="Nenhuma pasta disponível" />
      ) : (
        <FolderTree rootFolders={roots} dense />
      )}
    </div>
  );
}

function ClientFollowUpsPanel({
  client,
  followUps,
  onNew,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  client: { id: string; name: string };
  followUps: FollowUp[];
  onNew: () => void;
  onEdit: (f: FollowUp) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: FollowUpStatus) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<FollowUpType | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      followUps
        .filter((f) => (statusFilter === "all" ? true : f.status === statusFilter))
        .filter((f) => (typeFilter === "all" ? true : f.type === typeFilter))
        .filter((f) => {
          if (!q) return true;
          const t = q.toLowerCase();
          return (
            f.notes.toLowerCase().includes(t) ||
            f.type.toLowerCase().includes(t) ||
            f.status.toLowerCase().includes(t)
          );
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [followUps, statusFilter, typeFilter, q],
  );

  const typeIcon: Record<FollowUpType, typeof Phone> = {
    ligacao: Phone,
    email: Mail,
    whatsapp: MessageCircle,
    reuniao: Users,
    videocall: Video,
    nota: StickyNote,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar follow-ups..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 rounded-xl bg-muted border-0"
          />
        </div>
        <Button onClick={onNew} className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 h-9">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FollowUpStatus | "all")}>
          <SelectTrigger className="rounded-xl bg-muted border-0 flex-1">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="agendado">Agendado</SelectItem>
            <SelectItem value="realizado">Realizado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="adiado">Adiado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FollowUpType | "all")}>
          <SelectTrigger className="rounded-xl bg-muted border-0 flex-1">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ligacao">Ligação</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="reuniao">Reunião</SelectItem>
            <SelectItem value="videocall">Videocall</SelectItem>
            <SelectItem value="nota">Nota</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 bg-muted/40 rounded-2xl">
          <History className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Nenhum follow-up encontrado</p>
          <p className="text-xs text-muted-foreground">Adicione o primeiro para este cliente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => {
            const Icon = typeIcon[f.type];
            return (
              <div key={f.id} className="border border-border rounded-2xl p-4 bg-card">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-brand-soft p-2">
                    <Icon className="h-4 w-4 text-brand-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold">
                        {formatDateShort(f.date)} {f.time ? `· ${f.time}` : ""}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(f)}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          {f.status === "agendado" && (
                            <DropdownMenuItem onClick={() => onStatusChange(f.id, "realizado")}>
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar realizado
                            </DropdownMenuItem>
                          )}
                          {f.status === "agendado" && (
                            <DropdownMenuItem onClick={() => onStatusChange(f.id, "cancelado")}>
                              <XCircle className="h-4 w-4 mr-2" /> Cancelar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => onDelete(f.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={followUpStatusColor[f.status]}>{followUpStatusLabel[f.status]}</Badge>
                      <span className="text-xs text-muted-foreground capitalize">{f.type}</span>
                      {f.createdTaskId && (
                        <span className="text-[10px] text-muted-foreground">· via Kanban</span>
                      )}
                    </div>
                    {f.notes && <p className="text-sm mt-2 text-foreground">{f.notes}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const followUpStatusColor: Record<FollowUpStatus, string> = {
  agendado: "bg-info/15 text-info border-0",
  realizado: "bg-success/15 text-success border-0",
  cancelado: "bg-muted text-muted-foreground border-0",
  adiado: "bg-warning/15 text-warning border-0",
};

const followUpStatusLabel: Record<FollowUpStatus, string> = {
  agendado: "Agendado",
  realizado: "Realizado",
  cancelado: "Cancelado",
  adiado: "Adiado",
};

function ContactRow({
  icon: Icon,
  value,
  aside,
}: {
  icon: typeof Phone;
  value: string;
  aside?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs truncate">{value}</span>
      {aside && <span className="text-[11px] text-muted-foreground shrink-0">· {aside}</span>}
    </div>
  );
}

function calcAge(iso: string): number {
  const b = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
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
