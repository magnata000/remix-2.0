import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
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
import {
  Search,
  FileText,
  Plus,
  FileUp,
  Loader2,
  AlertTriangle,
  RotateCw,
  Ban,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  POLICY_STATUS_META,
  POLICY_STATUS_FILTER,
  isTerminalStatus,
} from "@/lib/portfolio/policyStatus";
import { listPendingReasons } from "@/lib/portfolio/portfolio.functions";
import { PolicyReasonDialog } from "@/components/portfolio/PolicyReasonDialog";
import { formatBRL, formatDateShort, type Policy } from "@/lib/mock/data";
import { usePolicies } from "@/lib/portfolio/policyStore";
import { NewPolicyDialog, type PolicyPrefill } from "@/components/portfolio/NewPolicyDialog";
import { PolicyDetailDrawer } from "@/components/portfolio/PolicyDetailDrawer";
import { ImportPolicyReviewDialog } from "@/components/portfolio/ImportPolicyReviewDialog";
import {
  extractPolicyFromPdf,
  type PolicyExtractionResult,
} from "@/lib/portfolio/policyExtraction.functions";
import { compareByPrefixNumber } from "@/lib/prefixSort";
import { toast } from "sonner";

type Props = {
  initialClientFilter?: string;
  onClientClick?: (clientName: string) => void;
};

export function PoliciesTab({ initialClientFilter, onClientClick }: Props = {}) {
  const { policies } = usePolicies();
  const fetchPending = useServerFn(listPendingReasons);
  const { data: pendingIds = [] } = useQuery({
    queryKey: ["pending-reasons"],
    queryFn: () => fetchPending(),
  });
  const pendingSet = useMemo(() => new Set(pendingIds), [pendingIds]);
  const [showHistory, setShowHistory] = useState(false);
  const [renewSource, setRenewSource] = useState<Policy | null>(null);
  const [reasonTarget, setReasonTarget] = useState<{
    policy: Policy;
    mode: "cancel" | "reason";
  } | null>(null);

  const StatusControl = ({ p }: { p: Policy }) => {
    const meta = POLICY_STATUS_META[p.status];
    const pending = pendingSet.has(p.id);
    const badge = <Badge className={`${meta.className} whitespace-nowrap`}>{meta.label}</Badge>;
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {isTerminalStatus(p.status) ? (
          badge
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Alterar status"
                className="rounded-full cursor-pointer hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              >
                {badge}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {p.branch !== "Saúde" && (
                <DropdownMenuItem onClick={() => setRenewSource(p)}>
                  <RotateCw className="h-4 w-4" /> Marcar como renovada
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setReasonTarget({ policy: p, mode: "cancel" })}>
                <Ban className="h-4 w-4" /> Cancelar apólice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {pending && (
          <button
            type="button"
            title="Registrar motivo da não renovação"
            onClick={() => setReasonTarget({ policy: p, mode: "reason" })}
            className="text-warning hover:opacity-80"
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };
  const [q, setQ] = useState(initialClientFilter ?? "");
  const [status, setStatus] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");
  const [insurer, setInsurer] = useState<string>("all");
  const [selected, setSelected] = useState<Policy | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [prefill, setPrefill] = useState<PolicyPrefill | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [extraction, setExtraction] = useState<PolicyExtractionResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extract = useServerFn(extractPolicyFromPdf);

  const insurers = useMemo(
    () => Array.from(new Set(policies.map((p) => p.insurer))).sort(),
    [policies],
  );

  const filtered = useMemo(
    () =>
      policies
        .filter(
          (p) =>
            (status === "all" ? showHistory || p.status !== "renovada" : p.status === status) &&
            (branch === "all" || p.branch === branch) &&
            (insurer === "all" || p.insurer === insurer) &&
            (q === "" ||
              p.clientName.toLowerCase().includes(q.toLowerCase()) ||
              p.number.toLowerCase().includes(q.toLowerCase())),
        )
        .sort((a, b) => {
          const byPrefix = compareByPrefixNumber(a.clientName, b.clientName);
          return byPrefix !== 0 ? byPrefix : a.startDate.localeCompare(b.startDate);
        }),
    [policies, q, status, branch, insurer, showHistory],
  );

  const handleFileSelected = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("PDF muito grande (máx. 10MB)");
      return;
    }
    setImporting(true);
    const toastId = toast.loading("Lendo PDF com IA...");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const result = await extract({
        data: { fileBase64: base64, mimeType: file.type || "application/pdf", fileName: file.name },
      });
      toast.dismiss(toastId);
      toast.success("Dados extraídos — revise antes de aplicar");
      setExtraction(result);
      setReviewOpen(true);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : "Falha ao ler PDF");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelected(f);
          e.target.value = "";
        }}
      />

      {/* Header com botões */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="rounded-xl h-9"
        >
          {importing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4" />
          )}
          <span className="hidden md:inline">Importar PDF</span>
        </Button>
        <Button
          onClick={() => {
            setPrefill(null);
            setNewOpen(true);
          }}
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
              placeholder="Buscar por cliente..."
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
              {POLICY_STATUS_FILTER.map((st) => (
                <SelectItem key={st} value={st}>
                  {POLICY_STATUS_META[st].label}
                </SelectItem>
              ))}
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
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
            <Switch checked={showHistory} onCheckedChange={setShowHistory} />
            Mostrar renovadas
          </label>
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
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold truncate">{p.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.branch} • {p.insurer}
                    </p>
                    <p className="mt-3 text-lg font-bold">{formatBRL(p.premium)}</p>
                  </div>
                  <StatusControl p={p} />
                </div>
              </button>
            ))}
          </div>

          {/* Desktop: tabela */}
          <Card className="rounded-2xl border-border shadow-none overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
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
                        <StatusControl p={p} />
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

      <NewPolicyDialog
        open={newOpen}
        onOpenChange={(o) => {
          setNewOpen(o);
          if (!o) setPrefill(null);
        }}
        prefill={prefill}
      />

      {renewSource && (
        <NewPolicyDialog
          open={!!renewSource}
          onOpenChange={(o) => !o && setRenewSource(null)}
          sourcePolicy={renewSource}
        />
      )}

      <PolicyReasonDialog
        open={!!reasonTarget}
        onOpenChange={(o) => !o && setReasonTarget(null)}
        policyId={reasonTarget?.policy.id ?? null}
        policyNumber={reasonTarget?.policy.number}
        mode={reasonTarget?.mode ?? "cancel"}
      />

      <ImportPolicyReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        extraction={extraction}
        onConfirm={(p) => {
          setPrefill(p);
          setReviewOpen(false);
          setNewOpen(true);
        }}
      />
    </div>
  );
}
