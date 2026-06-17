import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useClientStore } from "@/lib/portfolio/clientStore";
import type { Client } from "@/lib/mock/data";
import { toast } from "sonner";
import { z } from "zod";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; client: Client | null };

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(8, "Telefone obrigatório").max(30),
  document: z.string().trim().min(5, "Documento obrigatório").max(30),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

function isValidISODate(iso: string): boolean {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day &&
    d.getTime() <= Date.now() &&
    year >= 1900
  );
}

const todayISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

function maskPhone(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskCpfCnpj(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function EditClientDialog({ open, onOpenChange, client }: Props) {
  const { updateClient } = useClientStore();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [birthDateMasked, setBirthDateMasked] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && client) {
      setEmail(client.email);
      setPhone(maskPhone(client.phone));
      setDocument(maskCpfCnpj(client.document));
      setBirthDateMasked(isoToMasked(client.birthDate));
      setErrors({});
    }
  }, [open, client]);

  if (!client) return null;

  const submit = () => {
    const iso = toISO(birthDateMasked);
    if (!iso) {
      const parsed = schema.safeParse({ email, phone, document, birthDate: "" });
      const errs: Record<string, string> = {};
      if (!parsed.success) {
        parsed.error.issues.forEach((i) => {
          const key = i.path[0] as string;
          if (key !== "birthDate") errs[key] = i.message;
        });
      }
      errs.birthDate = "Data inválida";
      setErrors(errs);
      return;
    }
    const parsed = schema.safeParse({ email, phone, document, birthDate: iso });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    updateClient(client.id, parsed.data);
    toast.success("Cliente atualizado");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>Editar cliente</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input value={client.name} disabled className="mt-1.5 rounded-xl bg-muted border-0" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Nome não pode ser alterado (referenciado em apólices e oportunidades).
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">E-mail *</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} className="mt-1.5 rounded-xl bg-muted border-0" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Telefone *</Label>
              <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} inputMode="numeric" maxLength={16} className="mt-1.5 rounded-xl bg-muted border-0" />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">CPF/CNPJ *</Label>
              <Input value={document} onChange={(e) => setDocument(maskCpfCnpj(e.target.value))} inputMode="numeric" maxLength={18} className="mt-1.5 rounded-xl bg-muted border-0" />
              {errors.document && <p className="text-xs text-destructive mt-1">{errors.document}</p>}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Data de nascimento *</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={birthDateMasked}
              onChange={(e) => setBirthDateMasked(maskDate(e.target.value))}
              placeholder="dd/mm/aaaa"
              maxLength={10}
              className="mt-1.5 rounded-xl bg-muted border-0"
            />
            {errors.birthDate && <p className="text-xs text-destructive mt-1">{errors.birthDate}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>Salvar alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
