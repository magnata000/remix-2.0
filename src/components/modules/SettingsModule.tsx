import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2,
  Users,
  Plug,
  Bell,
  CreditCard,
  Check,
  Pencil,
  Trash2,
  MailPlus,
} from "lucide-react";
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
import { useTeam, buildInviteLink, type Member } from "@/lib/team/teamStore";
import { EditMemberDialog } from "@/components/settings/EditMemberDialog";
import { InviteMemberDialog } from "@/components/settings/InviteMemberDialog";
import { CommissionConfigSection } from "@/components/settings/CommissionConfigSection";
import { SlaConfigSection } from "@/components/settings/SlaConfigSection";

import { toast } from "sonner";


const integrations = [
  { name: "Porto Seguro", connected: true },
  { name: "Bradesco", connected: true },
  { name: "SulAmérica", connected: true },
  { name: "Allianz", connected: false },
  { name: "Mapfre", connected: false },
];

export function SettingsModule() {
  const { members, removeMember, resendInvite } = useTeam();
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const handleResend = (m: Member) => {
    const updated = resendInvite(m.id);
    if (updated?.inviteToken) {
      const link = buildInviteLink(updated.inviteToken);
      navigator.clipboard?.writeText(link).catch(() => {});
      toast.success(`Convite reenviado — link copiado`);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie sua corretora, equipe e integrações</p>
      </div>

      {/* Perfil */}
      <Section icon={Building2} title="Perfil da corretora" desc="Informações exibidas em propostas">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Razão social" defaultValue="InsuranceOS Corretora Ltda" />
          <Field label="CNPJ" defaultValue="00.000.000/0001-00" />
          <Field label="E-mail" defaultValue="contato@insuranceos.com" />
          <Field label="Telefone" defaultValue="(11) 4000-0000" />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => toast.success("Perfil atualizado")}
          >
            Salvar
          </Button>
        </div>
      </Section>

      {/* Equipe */}
      <Section icon={Users} title="Equipe" desc={`${members.length} membros ativos`}>
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-brand-soft text-brand-foreground font-semibold text-sm">
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              {m.status === "pending" && (
                <Badge className="rounded-full text-xs bg-warning/15 text-warning border-0">
                  Pendente
                </Badge>
              )}
              <Badge variant="outline" className="rounded-full text-xs hidden sm:inline-flex">
                {m.role}
              </Badge>
              <div className="flex items-center gap-1">
                {m.status === "pending" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => handleResend(m)}
                    aria-label="Reenviar convite"
                    title="Reenviar convite"
                  >
                    <MailPlus className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setEditing(m)}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                  onClick={() => setDeleting(m)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setInviteOpen(true)}
          >
            Convidar membro
          </Button>
        </div>
      </Section>

      {/* Integrações */}
      <Section icon={Plug} title="Integrações" desc="Seguradoras conectadas ao multicálculo">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {integrations.map((i) => (
            <Card
              key={i.name}
              className="p-4 rounded-xl border-border shadow-none flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                  {i.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.connected ? "Conectada" : "Desconectada"}
                  </p>
                </div>
              </div>
              {i.connected ? (
                <Badge className="bg-success/15 text-success border-0">
                  <Check className="h-3 w-3" />
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg text-xs"
                  onClick={() => toast.success(`${i.name} conectada`)}
                >
                  Conectar
                </Button>
              )}
            </Card>
          ))}
        </div>
      </Section>

      {/* Comissionamento */}
      <CommissionConfigSection />

      {/* SLA */}
      <SlaConfigSection />



      {/* Preferências */}
      <Section icon={Bell} title="Preferências" desc="Notificações e alertas">
        <div className="space-y-3">
          <Toggle label="E-mail de novas propostas" defaultChecked />
          <Toggle label="Alerta de apólices a vencer (30 dias)" defaultChecked />
          <Toggle label="Resumo semanal de comissões" defaultChecked />
          <Toggle label="Notificações push" />
        </div>
      </Section>

      {/* Plano */}
      <Section icon={CreditCard} title="Plano & Faturamento" desc="Plano Pro • Renova em 12/05/2026">
        <div className="rounded-2xl bg-brand/15 p-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Plano atual</p>
            <p className="text-2xl font-bold">Pro</p>
            <p className="text-xs text-muted-foreground mt-1">
              Até 2.000 apólices • 5 usuários • Multicálculo ilimitado
            </p>
          </div>
          <Button variant="outline" className="rounded-xl bg-card">
            Alterar plano
          </Button>
        </div>
      </Section>

      <EditMemberDialog
        member={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `${deleting.name} perderá o acesso à corretora. Esta ação não pode ser desfeita.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) {
                  removeMember(deleting.id);
                  toast.success("Colaborador removido");
                  setDeleting(null);
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: typeof Building2;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 rounded-2xl border-border shadow-none">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-brand-soft flex items-center justify-center">
          <Icon className="h-5 w-5 text-brand-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input defaultValue={defaultValue} className="mt-1.5 rounded-xl bg-muted border-0" />
    </div>
  );
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40">
      <Label className="text-sm">{label}</Label>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
