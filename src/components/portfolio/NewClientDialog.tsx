import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useClientStore } from "@/lib/portfolio/clientStore";
import { toast } from "sonner";
import { z } from "zod";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

const schema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório").max(100, "Máx. 100 caracteres"),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(8, "Telefone obrigatório").max(30),
  document: z.string().trim().min(5, "Documento obrigatório").max(30),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

function maskDate(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function toISO(masked: string): string | null {
  const m = masked.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day ||
    d.getTime() > Date.now() ||
    year < 1900
  ) {
    return null;
  }
  return `${m[3]}-${m[2]}-${m[1]}`;
}
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


export function NewClientDialog({ open, onOpenChange }: Props) {
  const { addClient, clients } = useClientStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [birthDateMasked, setBirthDateMasked] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setName(""); setEmail(""); setPhone(""); setDocument(""); setBirthDateMasked(""); setErrors({});
    }
  }, [open]);

  const submit = () => {
    const iso = toISO(birthDateMasked);
    if (!iso) {
      const parsed = schema.safeParse({ name, email, phone, document, birthDate: "" });
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
    const parsed = schema.safeParse({ name, email, phone, document, birthDate: iso });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    if (clients.some((c) => c.name.toLowerCase() === parsed.data.name.toLowerCase())) {
      setErrors({ name: "Já existe um cliente com esse nome" });
      return;
    }
    addClient(parsed.data);
    toast.success("Cliente criado");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Nome completo" className="mt-1.5 rounded-xl bg-muted border-0" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">E-mail *</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} placeholder="cliente@email.com" className="mt-1.5 rounded-xl bg-muted border-0" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Telefone *</Label>
              <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} inputMode="numeric" maxLength={16} placeholder="(11) 90000-0000" className="mt-1.5 rounded-xl bg-muted border-0" />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">CPF/CNPJ *</Label>
              <Input value={document} onChange={(e) => setDocument(maskCpfCnpj(e.target.value))} inputMode="numeric" maxLength={18} placeholder="000.000.000-00" className="mt-1.5 rounded-xl bg-muted border-0" />
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
          <Button className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" onClick={submit}>Criar cliente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
