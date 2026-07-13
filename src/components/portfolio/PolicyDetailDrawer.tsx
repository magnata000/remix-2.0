import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Calendar,
  Building2,
  User,
  RotateCw,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import {
  formatBRL,
  formatDateShort,
  type Beneficiary,
  type BeneficiaryTitle,
  type Policy,
  type PolicyStatus,
} from "@/lib/mock/data";
import { usePolicyStore } from "@/lib/portfolio/policyStore";
import { useCommissionStore } from "@/lib/financial/commissionStore";
import { RenewPolicyDialog } from "@/components/portfolio/RenewPolicyDialog";
import { EditPolicyDialog } from "@/components/portfolio/EditPolicyDialog";
import { useDocumentStore } from "@/lib/documents/documentStore";
import { FolderTree } from "@/components/documents/FolderTree";
import { toast } from "sonner";

const statusColor: Record<PolicyStatus, string> = {
  ativa: "bg-success/15 text-success border-0",
  pendente: "bg-warning/15 text-warning border-0",
  vencida: "bg-destructive/15 text-destructive border-0",
  cancelada: "bg-muted text-muted-foreground border-0",
  renovada: "bg-info/15 text-info border-0",
};

const titleLabel: Record<BeneficiaryTitle, string> = {
  titular: "Titular",
  conjuge: "Cônjuge",
  filho: "Filho(a)",
  pai_mae: "Pai/Mãe",
  irmao: "Irmão(ã)",
  parente: "Parente",
  outro: "Outro",
};

function calcAge(iso: string): number | null {
  if (!iso) return null;
  const b = new Date(iso);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 ? age : null;
}

export function PolicyDetailDrawer({
  policy,
  onOpenChange,
  onSelectPolicy,
}: {
  policy: Policy | null;
  onOpenChange: (open: boolean) => void;
  onSelectPolicy?: (p: Policy) => void;
}) {
  const docStore = useDocumentStore();
  const { isAlreadyRenewed, renewalChainOf, renewalIndexOf, findPolicy, deletePolicy } = usePolicyStore();
  const { deleteByPolicy: deleteCommissionsByPolicy } = useCommissionStore();
  const root = policy ? docStore.rootFolderOf(policy.id) : undefined;
  const docCount = policy ? docStore.countByPolicy(policy.id) : 0;
  const [renewOpen, setRenewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const chainIndex = policy ? renewalIndexOf(policy.id) : -1;
  const chain = policy ? renewalChainOf(policy.id) : [];
  const previous = policy?.renewedFromId ? findPolicy(policy.renewedFromId) : undefined;
  const next = policy?.renewedToId ? findPolicy(policy.renewedToId) : undefined;
  const alreadyRenewed = policy ? isAlreadyRenewed(policy.id) : false;

  const handleDelete = () => {
    if (!policy) return;
    const number = policy.number;
    deleteCommissionsByPolicy(policy.id);
    docStore.deleteByPolicy(policy.id);
    deletePolicy(policy.id);
    setConfirmDelete(false);
    onOpenChange(false);
    toast.success(`Apólice ${number} excluída`);
  };

  const ordinalLabel = (i: number) => {
    if (i <= 0) return null;
    return `${i}ª renovação`;
  };

  const premiumLabel = policy?.branch === "Saúde" ? "Prêmio mensal" : "Prêmio anual";

  return (
    <Sheet open={!!policy} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {policy && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand" />
                {policy.number}
                {chain.length > 1 && ordinalLabel(chainIndex) && (
                  <span className="ml-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-info/15 text-info">
                    {ordinalLabel(chainIndex)}
                  </span>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 ml-1 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditOpen(true)}
                        aria-label="Editar dados"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar dados</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(true)}
                        aria-label="Excluir apólice"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir apólice</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </SheetTitle>
              <SheetDescription>
                Detalhes da apólice
                {previous && (
                  <>
                    {" • "}
                    <button
                      type="button"
                      onClick={() => onSelectPolicy?.(previous)}
                      className="text-xs hover:text-brand hover:underline font-mono"
                    >
                      Renovada de {previous.number}
                    </button>
                  </>
                )}
                {next && (
                  <>
                    {" • "}
                    <button
                      type="button"
                      onClick={() => onSelectPolicy?.(next)}
                      className="text-xs hover:text-brand hover:underline font-mono"
                    >
                      Renovada em {next.number}
                    </button>
                  </>
                )}
              </SheetDescription>
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
                    value={
                      policy.branch === "Saúde"
                        ? "Vitalício"
                        : `${formatDateShort(policy.startDate)}${policy.endDate ? ` → ${formatDateShort(policy.endDate)}` : ""}`
                    }
                  />
                </div>

                {policy.branch === "Saúde" && (
                  <div className="space-y-3">
                    <Row
                      icon={FileText}
                      label="Categoria do plano"
                      value={policy.healthCategory || "—"}
                    />
                    <Row
                      icon={FileText}
                      label="Coparticipação"
                      value={policy.healthCoparticipation ? "Sim" : "Não"}
                    />
                    <BeneficiariesBlock beneficiaries={policy.beneficiaries ?? []} />
                  </div>
                )}

                {policy.branch === "Consórcio" && (
                  <div className="space-y-3">
                    <Row icon={FileText} label="Grupo" value={policy.consortiumGroup || "—"} />
                    <Row icon={FileText} label="Cota" value={policy.consortiumQuota || "—"} />
                    <Row icon={FileText} label="Tipo" value={policy.consortiumType || "—"} />
                  </div>
                )}

                <div className="rounded-2xl bg-brand/15 p-5">
                  <p className="text-xs text-muted-foreground">{premiumLabel}</p>
                  <p className="mt-1 text-3xl font-bold">{formatBRL(policy.premium)}</p>
                </div>

                <div className="flex gap-2">
                  {policy.branch !== "Saúde" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex-1">
                            <Button
                              onClick={() => setRenewOpen(true)}
                              disabled={alreadyRenewed}
                              className="w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
                            >
                              <RotateCw className="h-4 w-4" />
                              Renovar
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {alreadyRenewed && next && (
                          <TooltipContent>Já renovada em {next.number}</TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  )}
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

            {policy.branch !== "Saúde" && (
              <RenewPolicyDialog
                open={renewOpen}
                onOpenChange={setRenewOpen}
                sourcePolicy={policy}
              />
            )}
            <EditPolicyDialog open={editOpen} onOpenChange={setEditOpen} policy={policy} />

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir apólice?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A apólice <span className="font-medium font-mono">{policy.number}</span> de{" "}
                    <span className="font-medium">{policy.clientName}</span> será removida
                    permanentemente, junto com suas comissões e documentos vinculados. Esta ação
                    não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BeneficiariesBlock({ beneficiaries }: { beneficiaries: Beneficiary[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Beneficiários</h3>
        <span className="text-xs text-muted-foreground">({beneficiaries.length})</span>
      </div>
      {beneficiaries.length === 0 ? (
        <p className="text-xs text-muted-foreground italic bg-muted/40 rounded-xl px-3 py-3 text-center">
          Nenhum beneficiário cadastrado.
        </p>
      ) : (
        <ul className="space-y-2">
          {beneficiaries.map((b) => {
            const age = calcAge(b.birthDate);
            const title =
              (b.title === "parente" || b.title === "outro") && b.titleCustom
                ? b.titleCustom
                : titleLabel[b.title];
            return (
              <li
                key={b.id}
                className="rounded-xl border border-border/60 bg-card px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{b.name || "Sem nome"}</span>
                  <Badge className="bg-muted text-muted-foreground border-0 shrink-0">
                    {title}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                  {b.birthDate && (
                    <span>
                      {formatDateShort(b.birthDate)}
                      {age !== null && ` · ${age} anos`}
                    </span>
                  )}
                  {b.cpf && <span>{b.cpf}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
