import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { describeRecurrence, type Recurrence } from "@/lib/tasks/recurrence";

const WD = ["D", "S", "T", "Q", "Q", "S", "S"];

type Props = { value: Recurrence; onChange: (r: Recurrence) => void };

export function RecurrenceEditor({ value, onChange }: Props) {
  const upd = (patch: Partial<Recurrence>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3 rounded-xl bg-muted/40 p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Frequência</Label>
          <Select value={value.freq} onValueChange={(v) => upd({ freq: v as Recurrence["freq"] })}>
            <SelectTrigger className="mt-1.5 h-9 rounded-lg bg-card border-0 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diária</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">A cada</Label>
          <Input
            type="number" min={1} step={1}
            value={value.interval}
            onChange={(e) => upd({ interval: Math.max(1, Number(e.target.value) || 1) })}
            className="mt-1.5 h-9 rounded-lg bg-card border-0 text-xs"
          />
        </div>
      </div>

      {value.freq === "daily" && (
        <div>
          <Label className="text-xs text-muted-foreground">Paridade</Label>
          <Select
            value={value.parity ?? "none"}
            onValueChange={(v) => upd({ parity: v === "none" ? undefined : (v as "even" | "odd") })}
          >
            <SelectTrigger className="mt-1.5 h-9 rounded-lg bg-card border-0 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Todos os dias</SelectItem>
              <SelectItem value="even">Somente pares</SelectItem>
              <SelectItem value="odd">Somente ímpares</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {value.freq === "weekly" && (
        <div>
          <Label className="text-xs text-muted-foreground">Dias da semana</Label>
          <ToggleGroup
            type="multiple"
            value={(value.byWeekday ?? []).map(String)}
            onValueChange={(vals) => upd({ byWeekday: vals.map(Number).sort() })}
            className="mt-1.5 justify-start flex-wrap"
          >
            {WD.map((l, i) => (
              <ToggleGroupItem key={i} value={String(i)} className="h-9 w-9 rounded-lg">{l}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      {value.freq === "monthly" && (
        <div>
          <Label className="text-xs text-muted-foreground">Dia do mês</Label>
          <Input
            type="number" min={1} max={31} step={1}
            value={value.byMonthDay ?? ""}
            onChange={(e) => upd({ byMonthDay: Number(e.target.value) || undefined })}
            placeholder="Ex: 15"
            className="mt-1.5 h-9 rounded-lg bg-card border-0 text-xs"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Até (opcional)</Label>
          <Input
            type="date"
            value={value.until ? value.until.slice(0, 10) : ""}
            onChange={(e) => upd({ until: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            className="mt-1.5 h-9 rounded-lg bg-card border-0 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Nº ocorrências</Label>
          <Input
            type="number" min={1} step={1}
            value={value.count ?? ""}
            onChange={(e) => upd({ count: Number(e.target.value) || undefined })}
            placeholder="Ilimitado"
            className="mt-1.5 h-9 rounded-lg bg-card border-0 text-xs"
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Prévia: <span className="font-medium text-foreground">{describeRecurrence(value)}</span>
      </p>
    </div>
  );
}
