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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, FileText, Calendar, Building2, User, Plus } from "lucide-react";
import {
  formatBRL,
  formatDateShort,
  type Policy,
  type PolicyStatus,
} from "@/lib/mock/data";
import { usePolicyStore } from "@/lib/portfolio/policyStore";
import { NewPolicyDialog } from "@/components/portfolio/NewPolicyDialog";

import { useDocumentStore } from "@/lib/documents/documentStore";
import { FolderTree } from "@/components/documents/FolderTree";

const statusColor: Record<PolicyStatus, string> = {
  ativa: "bg-success/15 text-success border-0",
  pendente: "bg-warning/15 text-warning border-0",
  vencida: "bg-destructive/15 text-destructive border-0",
  cancelada: "bg-muted text-muted-foreground border-0",
};

type Props = {
  initialClientFilter?: string;
  onClientClick?: (clientName: string) => void;
};

export function PoliciesTab({ initialClientFilter, onClientClick }: Props = {}) {
  const { policies } = usePolicyStore();
  const [q, setQ] = useState(initialClientFilter ?? "");
  const [status, setStatus] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");
  const [selected, setSelected] = useState<Policy | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(
    () =>
      policies.filter(
        (p) =>
          (status === "all" || p.status === status) &&
          (branch === "all" || p.branch === branch) &&
          (q === "" ||
            p.clientName.toLowerCase().includes(q.toLowerCase()) ||
            p.number.toLowerCase().includes(q.toLowerCase())),
      ),
    [policies, q, status, branch],
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
                  <Badge className={statusColor[p.status]}>{p.status}</Badge>
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
                        {formatDateShort(p.endDate)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={statusColor[p.status]}>{p.status}</Badge>
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
      <PolicySheet
        policy={selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}

function PolicySheet({
  policy,
  onOpenChange,
}: {
  policy: Policy | null;
  onOpenChange: (open: boolean) => void;
}) {
  const docStore = useDocumentStore();
  const root = policy ? docStore.rootFolderOf(policy.id) : undefined;
  const docCount = policy ? docStore.countByPolicy(policy.id) : 0;

  return (
    <Sheet open={!!policy} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {policy && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand" />
                {policy.number}
              </SheetTitle>
              <SheetDescription>Detalhes da apólice</SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="details" className="px-4 mt-6">
              <TabsList className="rounded-xl bg-muted">
                <TabsTrigger value="details" className="rounded-lg">
                  Detalhes
                </TabsTrigger>
                <TabsTrigger value="documents" className="rounded-lg">
                  Documentos
                  <span className="ml-1.5 text-xs text-muted-foreground">({docCount})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-5 space-y-5">
                <Badge className={statusColor[policy.status]}>{policy.status}</Badge>

                <div className="space-y-3">
                  <Row icon={User} label="Cliente" value={policy.clientName} />
                  <Row icon={Building2} label="Seguradora" value={policy.insurer} />
                  <Row icon={FileText} label="Ramo" value={policy.branch} />
                  <Row
                    icon={Calendar}
                    label="Vigência"
                    value={`${formatDateShort(policy.startDate)} → ${formatDateShort(policy.endDate)}`}
                  />
                </div>

                <div className="rounded-2xl bg-brand/15 p-5">
                  <p className="text-xs text-muted-foreground">Prêmio anual</p>
                  <p className="mt-1 text-3xl font-bold">{formatBRL(policy.premium)}</p>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
                    Renovar
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl">
                    Imprimir
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-5">
                {root ? (
                  <FolderTree rootFolders={[root]} showRootNames={false} dense />
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Nenhuma pasta disponível para esta apólice.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
