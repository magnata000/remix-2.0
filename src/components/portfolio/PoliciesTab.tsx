import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, FileText, Plus } from "lucide-react";
import {
  formatBRL,
  formatDateShort,
  type Policy,
  type PolicyStatus,
} from "@/lib/mock/data";
import { usePolicies } from "@/lib/portfolio/policyStore";
import { NewPolicyDialog } from "@/components/portfolio/NewPolicyDialog";
import { PolicyDetailDrawer } from "@/components/portfolio/PolicyDetailDrawer";

const statusColor: Record<PolicyStatus, string> = {
  ativa: "bg-success/15 text-success border-0",
  pendente: "bg-warning/15 text-warning border-0",
  vencida: "bg-destructive/15 text-destructive border-0",
  cancelada: "bg-muted text-muted-foreground border-0",
  renovada: "bg-info/15 text-info border-0",
};

const POLICY_STATUS_CYCLE: PolicyStatus[] = ["ativa", "pendente", "vencida", "cancelada"];
function nextPolicyStatus(current: PolicyStatus): PolicyStatus {
  const idx = POLICY_STATUS_CYCLE.indexOf(current);
  if (idx === -1) return POLICY_STATUS_CYCLE[0];
  return POLICY_STATUS_CYCLE[(idx + 1) % POLICY_STATUS_CYCLE.length];
}

type Props = {
  initialClientFilter?: string;
  onClientClick?: (clientName: string) => void;
};

export function PoliciesTab({ initialClientFilter, onClientClick }: Props = {}) {
  const { policies, updatePolicy } = usePolicies();
  const cycleStatus = (id: string, current: PolicyStatus) =>
    updatePolicy(id, { status: nextPolicyStatus(current) });
  const [q, setQ] = useState(initialClientFilter ?? "");
  const [status, setStatus] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");
  const [insurer, setInsurer] = useState<string>("all");
  const [selected, setSelected] = useState<Policy | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const insurers = useMemo(
    () => Array.from(new Set(policies.map((p) => p.insurer))).sort(),
    [policies],
  );

  const filtered = useMemo(
    () =>
      policies.filter(
        (p) =>
          (status === "all" || p.status === status) &&
          (branch === "all" || p.branch === branch) &&
          (insurer === "all" || p.insurer === insurer) &&
          (q === "" ||
            p.clientName.toLowerCase().includes(q.toLowerCase()) ||
            p.number.toLowerCase().includes(q.toLowerCase())),
      ),
    [policies, q, status, branch, insurer],
  );



  return (
    <div className="space-y-5">
      {/* Header com botão Nova */}
      <div className="flex items-center justify-end">
        <Button
          onClick={() => setNewOpen(true)}
          className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 h-9"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Nova apólice</span>
        </Button>
      </div>


      {/* Filtros */}
      <Card className="p-4 rounded-2xl border-border shadow-none">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou número..."
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
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="vencida">Vencida</SelectItem>
              <SelectItem value="renovada">Renovada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
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
          <Select value={insurer} onValueChange={setInsurer}>
            <SelectTrigger className="md:w-48 rounded-xl bg-muted border-0">
              <SelectValue placeholder="Seguradora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as seguradoras</SelectItem>
              {insurers.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </Card>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card className="p-12 rounded-2xl border-border shadow-none text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 font-medium">Nenhuma apólice encontrada</p>
          <p className="text-sm text-muted-foreground">Ajuste os filtros e tente novamente.</p>
        </Card>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="text-left bg-card border border-border rounded-2xl p-4 hover:border-brand transition"
              >
                <div className="flex items-start justify-between">
                  <p className="font-mono text-xs text-muted-foreground">{p.number}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cycleStatus(p.id, p.status); }}
                    title="Clique para alterar o status"
                    className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  >
                    <Badge className={`${statusColor[p.status]} cursor-pointer hover:opacity-80 transition`}>{p.status}</Badge>
                  </button>
                </div>
                <p className="mt-2 font-semibold">{p.clientName}</p>
                <p className="text-xs text-muted-foreground">
                  {p.branch} • {p.insurer}
                </p>
                <p className="mt-3 text-lg font-bold">{formatBRL(p.premium)}</p>
              </button>
            ))}
          </div>

          {/* Desktop: tabela */}
          <Card className="rounded-2xl border-border shadow-none overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                    <th className="px-5 py-3 font-medium">Número</th>
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 font-medium">Ramo</th>
                    <th className="px-5 py-3 font-medium">Seguradora</th>
                    <th className="px-5 py-3 font-medium">Prêmio</th>
                    <th className="px-5 py-3 font-medium">Vigência</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                    >
                      <td className="px-5 py-3 font-mono text-xs">{p.number}</td>
                      <td className="px-5 py-3 font-medium">
                        {onClientClick ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClientClick(p.clientName);
                            }}
                            className="hover:text-brand hover:underline"
                          >
                            {p.clientName}
                          </button>
                        ) : (
                          p.clientName
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{p.branch}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.insurer}</td>
                      <td className="px-5 py-3 font-semibold">{formatBRL(p.premium)}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {p.branch === "Saúde" ? "Vitalício" : formatDateShort(p.endDate)}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); cycleStatus(p.id, p.status); }}
                          title="Clique para alterar o status"
                          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                        >
                          <Badge className={`${statusColor[p.status]} cursor-pointer hover:opacity-80 transition`}>{p.status}</Badge>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Drawer de detalhes */}
      <PolicyDetailDrawer
        policy={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onSelectPolicy={(p) => setSelected(p)}
      />

      <NewPolicyDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
