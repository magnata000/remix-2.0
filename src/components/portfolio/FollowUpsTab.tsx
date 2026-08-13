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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Phone, Mail, MessageCircle, Users, Plus, Search, Pencil, Trash2, CheckCircle2, XCircle, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";
import { useClients } from "@/lib/portfolio/clientStore";
import { useFollowUps } from "@/lib/portfolio/followUpStore";
import { FollowUpDialog } from "@/components/portfolio/FollowUpDialog";
import type { FollowUp, FollowUpStatus, FollowUpType } from "@/lib/mock/data";
import { toast } from "sonner";

const typeLabel: Record<FollowUpType, string> = {
  ligacao: "Ligação",
  email: "E-mail",
  whatsapp: "WhatsApp",
  reuniao: "Reunião",
  videocall: "Videocall",
  nota: "Nota",
};

const statusLabel: Record<FollowUpStatus, string> = {
  agendado: "Agendado",
  realizado: "Realizado",
  cancelado: "Cancelado",
  adiado: "Adiado",
};

const statusColor: Record<FollowUpStatus, string> = {
  agendado: "bg-info/15 text-info border-0",
  realizado: "bg-success/15 text-success border-0",
  cancelado: "bg-muted text-muted-foreground border-0",
  adiado: "bg-warning/15 text-warning border-0",
};

const typeIcon: Record<FollowUpType, typeof Phone> = {
  ligacao: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  reuniao: Users,
  videocall: MessageCircle,
  nota: MessageCircle,
};

const isoDate = (d?: Date) => (d ? d.toISOString().slice(0, 10) : "");

export function FollowUpsTab() {
  const { clients } = useClients();
  const { followUps, deleteFollowUp, changeStatus } = useFollowUps();
  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return followUps
      .filter((f) => {
        if (clientId !== "all" && f.clientId !== clientId) return false;
        if (type !== "all" && f.type !== type) return false;
        if (status !== "all" && f.status !== status) return false;
        if (start && f.date < start) return false;
        if (end && f.date > end) return false;
        if (q) {
          return (
            f.clientName.toLowerCase().includes(t) ||
            f.notes.toLowerCase().includes(t) ||
            typeLabel[f.type].toLowerCase().includes(t)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [followUps, clientId, type, status, start, end, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, FollowUp[]>();
    filtered.forEach((f) => {
      const key = f.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (f: FollowUp) => {
    setEditing(f);
    setDialogOpen(true);
  };

  const onDelete = (id: string) => {
    deleteFollowUp(id);
    toast.success("Follow-up removido");
  };

  const onStatusChange = (id: string, s: FollowUpStatus) => {
    changeStatus(id, s);
    toast.success(`Status atualizado para ${statusLabel[s]}`);
  };

  const clearFilters = () => {
    setQ("");
    setClientId("all");
    setType("all");
    setStatus("all");
    setStart("");
    setEnd("");
  };

  const hasFilters = q || clientId !== "all" || type !== "all" || status !== "all" || start || end;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <Button
          onClick={openNew}
          className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 h-9"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Novo follow-up</span>
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4 rounded-2xl border-border shadow-none">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, tipo ou notas..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 rounded-xl bg-muted border-0"
            />
          </div>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="md:w-44 rounded-xl bg-muted border-0">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="md:w-40 rounded-xl bg-muted border-0">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="ligacao">Ligação</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="reuniao">Reunião</SelectItem>
              <SelectItem value="videocall">Videocall</SelectItem>
              <SelectItem value="nota">Nota</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-40 rounded-xl bg-muted border-0">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="realizado">Realizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="adiado">Adiado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <DatePicker label="De" value={start} onChange={setStart} />
          <DatePicker label="Até" value={end} onChange={setEnd} />
          {hasFilters && (
            <Button variant="ghost" className="h-9 text-xs" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 rounded-2xl border-border shadow-none text-center">
          <Phone className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 font-medium">Nenhum follow-up encontrado</p>
          <p className="text-sm text-muted-foreground">Ajuste os filtros ou crie um novo.</p>
        </Card>
      ) : (
        <>
          {/* Mobile */}
          <div className="md:hidden space-y-4">
            {grouped.map(([date, items]) => (
              <div key={date}>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {formatDateHeader(date)}
                </div>
                <div className="space-y-2">
                  {items.map((f) => (
                    <FollowUpCard
                      key={f.id}
                      followUp={f}
                      onEdit={() => openEdit(f)}
                      onDelete={() => onDelete(f.id)}
                      onStatusChange={onStatusChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <Card className="rounded-2xl border-border shadow-none overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                    <th className="px-5 py-3 font-medium">Data / Hora</th>
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 font-medium">Tipo</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Anotações</th>
                    <th className="px-5 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(([date, items]) => (
                    <>
                      <tr key={`h-${date}`} className="bg-muted/30">
                        <td colSpan={6} className="px-5 py-2 text-xs font-medium text-muted-foreground">
                          {formatDateHeader(date)}
                        </td>
                      </tr>
                      {items.map((f) => (
                        <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="font-medium">{formatDateShort(f.date)}</div>
                            {f.time && <div className="text-xs text-muted-foreground">{f.time}</div>}
                          </td>
                          <td className="px-5 py-3 font-medium">{f.clientName}</td>
                          <td className="px-5 py-3">
                            <TypeBadge type={f.type} />
                          </td>
                          <td className="px-5 py-3">
                            <Badge className={statusColor[f.status]}>{statusLabel[f.status]}</Badge>
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground max-w-xs truncate">
                            {f.notes || "—"}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <ActionMenu
                              followUp={f}
                              onEdit={() => openEdit(f)}
                              onDelete={() => onDelete(f.id)}
                              onStatusChange={onStatusChange}
                            />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <FollowUpDialog open={dialogOpen} onOpenChange={setDialogOpen} followUp={editing} />
    </div>
  );
}

function DatePicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "rounded-xl bg-muted border-0 font-normal text-xs h-9",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 mr-1" />
            {value ? formatDateShort(value) : "—"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value) : undefined}
            onSelect={(d) => onChange(d ? isoDate(d) : "")}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function formatDateHeader(date: string) {
  const today = isoDate(new Date());
  const tomorrow = isoDate(new Date(Date.now() + 86400000));
  if (date === today) return "Hoje";
  if (date === tomorrow) return "Amanhã";
  return formatDateShort(date);
}

function TypeBadge({ type }: { type: FollowUpType }) {
  const Icon = typeIcon[type];
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{typeLabel[type]}</span>
    </div>
  );
}

function ActionMenu({
  followUp,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  followUp: FollowUp;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (id: string, s: FollowUpStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </DropdownMenuItem>
        {followUp.status !== "realizado" && (
          <DropdownMenuItem onClick={() => onStatusChange(followUp.id, "realizado")}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar realizado
          </DropdownMenuItem>
        )}
        {followUp.status !== "cancelado" && (
          <DropdownMenuItem onClick={() => onStatusChange(followUp.id, "cancelado")}>
            <XCircle className="h-4 w-4 mr-2" /> Cancelar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FollowUpCard({
  followUp,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  followUp: FollowUp;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (id: string, s: FollowUpStatus) => void;
}) {
  const Icon = typeIcon[followUp.type];
  return (
    <Card className="p-4 rounded-2xl border-border shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-brand" />
          </div>
          <div>
            <p className="font-semibold text-sm">{followUp.clientName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateShort(followUp.date)} {followUp.time && `· ${followUp.time}`}
            </p>
          </div>
        </div>
        <Badge className={statusColor[followUp.status]}>{statusLabel[followUp.status]}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <TypeBadge type={followUp.type} />
      </div>
      {followUp.notes && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{followUp.notes}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
        </Button>
        {followUp.status !== "realizado" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => onStatusChange(followUp.id, "realizado")}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Realizado
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
        </Button>
      </div>
    </Card>
  );
}
