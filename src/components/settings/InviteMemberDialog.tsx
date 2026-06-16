import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useTeam, TEAM_ROLES, buildInviteLink, type TeamRole } from "@/lib/team/teamStore";

export function InviteMemberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { addMember, members } = useTeam();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("Vendedor");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setEmail("");
    setRole("Vendedor");
    setInviteLink(null);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSend = () => {
    if (name.trim().length < 2) return toast.error("Informe um nome válido");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Informe um e-mail válido");
    if (members.some((m) => m.email.toLowerCase() === email.trim().toLowerCase())) {
      return toast.error("Já existe um colaborador com esse e-mail");
    }
    const member = addMember({ name: name.trim(), email: email.trim(), role, status: "pending" });
    const link = buildInviteLink(member.inviteToken!);
    setInviteLink(link);
    toast.success(`Convite enviado para ${member.email}`);
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
          <DialogDescription>
            O colaborador receberá um convite por e-mail para definir a senha e acessar a corretora.
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cargo</Label>
              <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Convite criado. Compartilhe o link abaixo enquanto o e-mail automático não está
              configurado:
            </p>
            <div className="flex items-center gap-2">
              <Input value={inviteLink} readOnly className="rounded-xl bg-muted border-0 text-xs" />
              <Button
                size="icon"
                variant="outline"
                className="rounded-xl shrink-0"
                onClick={handleCopy}
                aria-label="Copiar link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {!inviteLink ? (
            <>
              <Button variant="outline" className="rounded-xl" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button
                className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={handleSend}
              >
                Enviar convite
              </Button>
            </>
          ) : (
            <Button
              className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => handleClose(false)}
            >
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
