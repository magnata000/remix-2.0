import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Ban, Check, MailPlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/lib/auth/roleStore";
import {
  PAGE_KEYS,
  PAGE_LABELS,
  PAYMENT_MODEL_NAMES,
  ROLE_LABEL_NAMES,
  STATUS_NAMES,
  defaultPermissions,
  type PageKey,
  type PaymentModel,
  type RoleLabel,
} from "@/lib/settings/permissions";
import {
  deleteCommissionModel,
  inviteSettingsUser,
  listAccessRequests,
  listCommissionModels,
  listSettingsUsers,
  renameCatalogItem,
  resendSettingsInvite,
  resolveAccessRequest,
  setSettingsUserBlocked,
  updateSettingsUser,
  upsertCommissionModel,
  type SettingsUser,
} from "@/lib/settings/settings.functions";
import {
  createCatalogItem,
  listBranches,
  listInsurers,
  setCatalogItemActive,
  type CatalogItem,
} from "@/lib/portfolio/portfolio.functions";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Erro inesperado");

export function SettingsModule() {
  const { isAdmin } = useRole();
  if (!isAdmin) return <p className="text-sm text-muted-foreground">Acesso restrito ao administrador.</p>;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Usuários e permissões, ramos, seguradoras e modelos de comissionamento
        </p>
      </div>
      <Tabs defaultValue="usuarios">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="ramos">Ramos</TabsTrigger>
          <TabsTrigger value="seguradoras">Seguradoras</TabsTrigger>
          <TabsTrigger value="comissao">Comissionamento</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios" className="mt-5 space-y-5">
          <AccessRequestsSection />
          <UsersSection />
        </TabsContent>
        <TabsContent value="ramos" className="mt-5">
          <CatalogSection kind="branch" />
        </TabsContent>
        <TabsContent value="seguradoras" className="mt-5">
          <CatalogSection kind="insurer" />
        </TabsContent>
        <TabsContent value="comissao" className="mt-5">
          <CommissionModelsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Usuários ----------------

function UsersSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSettingsUsers);
  const blockFn = useServerFn(setSettingsUserBlocked);
  const resendFn = useServerFn(resendSettingsInvite);
  const { userId } = useRole();
  const { data: users = [] } = useQuery({ queryKey: ["settings-users"], queryFn: () => listFn() });
  const [editing, setEditing] = useState<SettingsUser | "new" | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["settings-users"] });
    void qc.invalidateQueries({ queryKey: ["team"] });
  };
  const block = useMutation({
    mutationFn: (d: { id: string; blocked: boolean }) => blockFn({ data: d }),
    onSuccess: (_r, d) => {
      toast.success(d.blocked ? "Usuário bloqueado" : "Usuário desbloqueado");
      refresh();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const resend = useMutation({
    mutationFn: (id: string) => resendFn({ data: { id, redirectTo: window.location.origin } }),
    onSuccess: () => toast.success("Convite reenviado por e-mail"),
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Card className="p-5 rounded-2xl border-border shadow-none">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-lg font-semibold">Usuários e permissões</h2>
          <p className="text-xs text-muted-foreground">{users.length} usuários cadastrados</p>
        </div>
        <Button className="rounded-xl" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Convidar usuário
        </Button>
      </div>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border">
            <div className="flex-1 min-w-40">
              <p className="font-semibold text-sm truncate">{u.name}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
            <Badge variant="outline" className="rounded-full text-xs">
              {ROLE_LABEL_NAMES[u.roleLabel]}
            </Badge>
            <Badge
              className={
                u.status === "ativo"
                  ? "rounded-full text-xs border-0 bg-success/15 text-success"
                  : u.status === "convidado"
                    ? "rounded-full text-xs border-0 bg-warning/15 text-warning"
                    : "rounded-full text-xs border-0 bg-destructive/15 text-destructive"
              }
            >
              {STATUS_NAMES[u.status]}
            </Badge>
            <div className="flex items-center gap-1">
              {u.status === "convidado" && (
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Reenviar convite" onClick={() => resend.mutate(u.id)}>
                  <MailPlus className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={() => setEditing(u)}>
                <Pencil className="h-4 w-4" />
              </Button>
              {u.id !== userId && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title={u.status === "bloqueado" ? "Desbloquear" : "Bloquear"}
                  onClick={() => block.mutate({ id: u.id, blocked: u.status !== "bloqueado" })}
                >
                  {u.status === "bloqueado" ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4 text-destructive" />}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <UserDialog
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </Card>
  );
}

function UserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: SettingsUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const inviteFn = useServerFn(inviteSettingsUser);
  const updateFn = useServerFn(updateSettingsUser);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [roleLabel, setRoleLabel] = useState<RoleLabel>(user?.roleLabel ?? "comercial");
  const [pages, setPages] = useState<PageKey[]>(user?.pages ?? defaultPermissions("comercial"));
  const [viewAll, setViewAll] = useState(user?.canViewAllOpportunities ?? false);

  const save = useMutation({
    mutationFn: () => {
      const base = { name, roleLabel, pages, canViewAllOpportunities: roleLabel === "comercial" && viewAll };
      return user
        ? updateFn({ data: { ...base, id: user.id } })
        : inviteFn({ data: { ...base, email, redirectTo: window.location.origin } });
    },
    onSuccess: () => {
      toast.success(user ? "Usuário atualizado" : "Convite enviado por e-mail");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const changeRole = (r: RoleLabel) => {
    setRoleLabel(r);
    if (!user) setPages(defaultPermissions(r));
  };
  const toggle = (p: PageKey, on: boolean) =>
    setPages((prev) => (on ? [...new Set([...prev, p])] : prev.filter((x) => x !== p)));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? "Editar usuário" : "Convidar usuário"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">E-mail corporativo</Label>
              <Input value={email} disabled={!!user} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={roleLabel} onValueChange={(v) => changeRole(v as RoleLabel)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABEL_NAMES) as RoleLabel[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL_NAMES[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Páginas permitidas</Label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PAGE_KEYS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={pages.includes(p)} onCheckedChange={(c) => toggle(p, c === true)} />
                  {PAGE_LABELS[p]}
                </label>
              ))}
            </div>
          </div>
          {roleLabel === "comercial" && (
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">Ver todas as oportunidades</p>
                <p className="text-xs text-muted-foreground">Mostra o Pipeline inteiro, não só as próprias.</p>
              </div>
              <Switch checked={viewAll} onCheckedChange={setViewAll} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {user ? "Salvar" : "Enviar convite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccessRequestsSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAccessRequests);
  const resolveFn = useServerFn(resolveAccessRequest);
  const { data = [] } = useQuery({ queryKey: ["access-requests"], queryFn: () => listFn() });
  const resolve = useMutation({
    mutationFn: (d: { id: string; approve: boolean }) => resolveFn({ data: d }),
    onSuccess: (_r, d) => {
      toast.success(d.approve ? "Acesso aprovado (Comercial). Ajuste as permissões abaixo." : "Solicitação recusada");
      for (const k of ["access-requests", "settings-users", "notifications", "team"])
        void qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  if (data.length === 0) return null;
  return (
    <Card className="p-5 rounded-2xl border-warning/40 shadow-none">
      <h2 className="text-lg font-semibold mb-3">Solicitações de acesso</h2>
      <div className="space-y-2">
        {data.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{r.name}</p>
              <p className="text-xs text-muted-foreground truncate">{r.email}</p>
            </div>
            <Button size="sm" onClick={() => resolve.mutate({ id: r.id, approve: true })}>
              <Check className="h-4 w-4" /> Aprovar
            </Button>
            <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: r.id, approve: false })}>
              <X className="h-4 w-4" /> Recusar
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------- Ramos e Seguradoras ----------------

function CatalogSection({ kind }: { kind: "branch" | "insurer" }) {
  const qc = useQueryClient();
  const listFn = useServerFn(kind === "branch" ? listBranches : listInsurers);
  const createFn = useServerFn(createCatalogItem);
  const activeFn = useServerFn(setCatalogItemActive);
  const renameFn = useServerFn(renameCatalogItem);
  const key = kind === "branch" ? "branches" : "insurers";
  const { data = [] } = useQuery({ queryKey: [key], queryFn: () => listFn() });
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: [key] });
  const onError = (e: unknown) => toast.error(errMsg(e));

  const create = useMutation({
    mutationFn: () => createFn({ data: { kind, name: newName } }),
    onSuccess: () => {
      setNewName("");
      refresh();
    },
    onError,
  });
  const rename = useMutation({
    mutationFn: (d: { id: string; name: string }) => renameFn({ data: { kind, ...d } }),
    onSuccess: () => {
      setEditing(null);
      refresh();
    },
    onError,
  });
  const setActive = useMutation({
    mutationFn: (item: CatalogItem) => activeFn({ data: { kind, id: item.id, isActive: !item.isActive } }),
    onSuccess: refresh,
    onError,
  });

  return (
    <Card className="p-5 rounded-2xl border-border shadow-none">
      <h2 className="text-lg font-semibold">{kind === "branch" ? "Ramos" : "Seguradoras"}</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Itens já usados em apólices não são excluídos — apenas desativados, preservando o histórico.
      </p>
      <form
        className="flex gap-2 mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) create.mutate();
        }}
      >
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Novo nome" />
        <Button type="submit" disabled={create.isPending}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </form>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border">
            {item.code && <Badge variant="outline" className="font-mono text-xs">{item.code}</Badge>}
            {editing?.id === item.id ? (
              <form
                className="flex-1 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  rename.mutate(editing);
                }}
              >
                <Input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-8" />
                <Button size="sm" type="submit">Salvar</Button>
                <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              </form>
            ) : (
              <p className={`flex-1 text-sm ${item.isActive ? "" : "text-muted-foreground line-through"}`}>{item.name}</p>
            )}
            {editing?.id !== item.id && (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing({ id: item.id, name: item.name })}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Switch checked={item.isActive} onCheckedChange={() => setActive.mutate(item)} aria-label="Ativo" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------- Modelos de comissionamento ----------------

function CommissionModelsSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCommissionModels);
  const upsertFn = useServerFn(upsertCommissionModel);
  const deleteFn = useServerFn(deleteCommissionModel);
  const branchesFn = useServerFn(listBranches);
  const insurersFn = useServerFn(listInsurers);
  const { data: models = [] } = useQuery({ queryKey: ["commission-models"], queryFn: () => listFn() });
  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: () => branchesFn() });
  const { data: insurers = [] } = useQuery({ queryKey: ["insurers"], queryFn: () => insurersFn() });
  const [insurerId, setInsurerId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [model, setModel] = useState<PaymentModel>("adiantamento");
  const [pct, setPct] = useState("");
  const refresh = () => void qc.invalidateQueries({ queryKey: ["commission-models"] });

  const save = useMutation({
    mutationFn: () =>
      upsertFn({
        data: { insurerId, branchId, modeloPagamento: model, percentualPadrao: parseFloat(pct.replace(",", ".")) },
      }),
    onSuccess: () => {
      toast.success("Modelo salvo");
      setPct("");
      refresh();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: refresh,
    onError: (e) => toast.error(errMsg(e)),
  });
  const nameOf = (list: CatalogItem[], id: string) => list.find((x) => x.id === id)?.name ?? "—";
  const edit = (m: (typeof models)[number]) => {
    setInsurerId(m.insurerId);
    setBranchId(m.branchId);
    setModel(m.modeloPagamento);
    setPct(String(m.percentualPadrao).replace(".", ","));
  };

  return (
    <Card className="p-5 rounded-2xl border-border shadow-none">
      <h2 className="text-lg font-semibold">Modelos de comissionamento</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Seguradora + Ramo definem o modelo de pagamento e o percentual padrão, carregados como ponto de
        partida ao criar ou renovar uma apólice. Impostos são lançados na comissão, não aqui.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
        <Select value={insurerId} onValueChange={setInsurerId}>
          <SelectTrigger><SelectValue placeholder="Seguradora" /></SelectTrigger>
          <SelectContent>
            {insurers.filter((i) => i.isActive).map((i) => (
              <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger><SelectValue placeholder="Ramo" /></SelectTrigger>
          <SelectContent>
            {branches.filter((b) => b.isActive).map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={model} onValueChange={(v) => setModel(v as PaymentModel)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PAYMENT_MODEL_NAMES) as PaymentModel[]).map((m) => (
              <SelectItem key={m} value={m}>{PAYMENT_MODEL_NAMES[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={pct} onChange={(e) => setPct(e.target.value)} placeholder="% padrão" inputMode="decimal" />
        <Button disabled={!insurerId || !branchId || !pct || save.isPending} onClick={() => save.mutate()}>
          Salvar
        </Button>
      </div>
      <div className="space-y-2">
        {models.length === 0 && <p className="text-xs text-muted-foreground">Nenhum modelo cadastrado.</p>}
        {models.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border text-sm">
            <p className="flex-1">
              <span className="font-medium">{nameOf(insurers, m.insurerId)}</span> · {nameOf(branches, m.branchId)}
            </p>
            <Badge variant="outline">{PAYMENT_MODEL_NAMES[m.modeloPagamento]}</Badge>
            <span className="tabular-nums">{String(m.percentualPadrao).replace(".", ",")}%</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => edit(m)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove.mutate(m.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
