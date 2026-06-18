import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, Users, Plus } from "lucide-react";
import {
  formatBRL,
  formatDateShort,
  type Branch,
} from "@/lib/mock/data";
import {
  listClientsWithStats,
  initialsOf,
  type ClientStats,
  type ClientStatus,
} from "@/lib/portfolio/clientStats";
import { useClientStore } from "@/lib/portfolio/clientStore";
import { usePolicyStore } from "@/lib/portfolio/policyStore";
import { NewClientDialog } from "@/components/portfolio/NewClientDialog";


const statusColor: Record<ClientStatus, string> = {
  ativo: "bg-success/15 text-success border-0",
  inativo: "bg-muted text-muted-foreground border-0",
  lead: "bg-info/15 text-info border-0",
};
const statusLabel: Record<ClientStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  lead: "Lead",
};

const CLIENT_STATUS_CYCLE: ClientStatus[] = ["ativo", "inativo", "lead"];
function nextClientStatus(current: ClientStatus): ClientStatus {
  const idx = CLIENT_STATUS_CYCLE.indexOf(current);
  return CLIENT_STATUS_CYCLE[(idx + 1) % CLIENT_STATUS_CYCLE.length];
}

type Props = {
  onSelectClient: (clientName: string) => void;
};

export function ClientsTab({ onSelectClient }: Props) {
  const { clients, setClientStatus } = useClientStore();
  const { policies } = usePolicyStore();
  const cycleStatus = (id: string, current: ClientStatus) =>
    setClientStatus(id, nextClientStatus(current));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");
  const [newOpen, setNewOpen] = useState(false);

  const all = useMemo(() => listClientsWithStats(clients, policies), [clients, policies]);

  const filtered = useMemo(
    () =>
      all.filter((s: ClientStats) => {
        if (status !== "all" && s.status !== status) return false;
        if (branch !== "all" && !s.branches.includes(branch as Branch)) return false;
        if (q !== "") {
          const t = q.toLowerCase();
          if (
            !s.client.name.toLowerCase().includes(t) &&
            !s.client.email.toLowerCase().includes(t) &&
            !s.client.document.toLowerCase().includes(t)
          )
            return false;
        }
        return true;
      }),
    [all, q, status, branch],
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <Button
          onClick={() => setNewOpen(true)}
          className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 h-9"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Novo cliente</span>
        </Button>
      </div>


      {/* Filtros */}
      <Card className="p-4 rounded-2xl border-border shadow-none">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou documento..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 rounded-xl bg-muted border-0"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-44 rounded-xl bg-muted border-0">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
              <SelectItem value="lead">Leads</SelectItem>
            </SelectContent>
          </Select>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="md:w-44 rounded-xl bg-muted border-0">
              <SelectValue placeholder="Ramo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ramos</SelectItem>
              <SelectItem value="Auto">Auto</SelectItem>
              <SelectItem value="Vida">Vida</SelectItem>
              <SelectItem value="Residencial">Residencial</SelectItem>
              <SelectItem value="Empresarial">Empresarial</SelectItem>
              <SelectItem value="Saúde">Saúde</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 rounded-2xl border-border shadow-none text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 font-medium">Nenhum cliente encontrado</p>
          <p className="text-sm text-muted-foreground">Ajuste os filtros e tente novamente.</p>
        </Card>
      ) : (
        <>
          {/* Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
            {filtered.map((s) => (
              <button
                key={s.client.id}
                onClick={() => onSelectClient(s.client.name)}
                className="text-left bg-card border border-border rounded-2xl p-4 hover:border-brand transition"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-brand-soft text-brand-foreground text-xs font-semibold">
                      {initialsOf(s.client.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{s.client.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.client.email}</p>
                  </div>
                  <Badge className={statusColor[s.status]}>{statusLabel[s.status]}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{s.activePolicies} apólice{s.activePolicies === 1 ? "" : "s"} ativa{s.activePolicies === 1 ? "" : "s"}</span>
                  <span className="font-semibold text-foreground">{formatBRL(s.annualPremium)}/ano</span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop */}
          <Card className="rounded-2xl border-border shadow-none overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 font-medium">Contato</th>
                    <th className="px-5 py-3 font-medium">Apólices ativas</th>
                    <th className="px-5 py-3 font-medium">Prêmio/ano</th>
                    <th className="px-5 py-3 font-medium">Última atividade</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.client.id}
                      onClick={() => onSelectClient(s.client.name)}
                      className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-brand-soft text-brand-foreground text-[10px] font-semibold">
                              {initialsOf(s.client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{s.client.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        <div>{s.client.email}</div>
                        <div>{s.client.phone}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-semibold">{s.activePolicies}</span>
                        <span className="text-muted-foreground"> / {s.totalPolicies}</span>
                      </td>
                      <td className="px-5 py-3 font-semibold">{formatBRL(s.annualPremium)}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {s.lastActivity ? formatDateShort(s.lastActivity) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={statusColor[s.status]}>{statusLabel[s.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <NewClientDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

