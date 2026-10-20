import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/financial/KpiCard";
import { TaxesCard } from "@/components/financial/TaxesCard";
import { formatBRL } from "@/lib/mock/data";
import { MONTHS_PT } from "@/lib/cash/cashStore";
import { listExpensesYear, createExpense, payExpense, getCashFlow } from "@/lib/financial/financeiro.functions";
import type { Database } from "@/integrations/supabase/types";

type DreClass = Database["public"]["Enums"]["dre_classification"];
const DRE_LABEL: Record<DreClass, string> = {
  custo_operacional: "Custo operacional",
  despesa_operacional: "Despesa operacional",
  imposto_sobre_lucro: "Imposto sobre lucro",
  outro: "Outro",
};
const STATUS: Record<string, { label: string; v: "default" | "secondary" | "destructive" }> = {
  aguardando: { label: "Aguardando", v: "secondary" },
  paga: { label: "Paga", v: "default" },
  vencida: { label: "Vencida", v: "destructive" },
};
const br = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");

export function ExpensesTab() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<string>(String(now.getMonth()));
  const [status, setStatus] = useState("todos");
  const [dre, setDre] = useState("todas");
  const [newOpen, setNewOpen] = useState(false);

  const listFn = useServerFn(listExpensesYear);
  const flowFn = useServerFn(getCashFlow);
  const payFn = useServerFn(payExpense);
  const { data, isLoading } = useQuery({ queryKey: ["expenses", year], queryFn: () => listFn({ data: { year } }) });
  const { data: flow } = useQuery({ queryKey: ["cash-flow", year], queryFn: () => flowFn({ data: { year } }) });
  const all = data ?? [];
  const refresh = () => { qc.invalidateQueries({ queryKey: ["expenses", year] }); qc.invalidateQueries({ queryKey: ["cash-flow", year] }); };

  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const rows = all.filter(
    (e) =>
      (month === "todos" || (e.due_date && Number(e.due_date.slice(5, 7)) - 1 === Number(month))) &&
      (status === "todos" || e.status === status) &&
      (dre === "todas" || e.dre_classification === dre),
  );
  const sum = (f: (e: (typeof rows)[number]) => boolean) => rows.filter(f).reduce((s, e) => s + Number(e.amount), 0);
  const soon = all.filter((e) => e.status === "aguardando" && e.due_date && e.due_date >= today && e.due_date <= in7).length;

  const pay = async (id: string) => {
    try { await payFn({ data: { expenseId: id } }); toast.success("Despesa marcada como paga"); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao pagar"); }
  };

  let saldo = 0;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard title="A pagar" value={formatBRL(sum((e) => e.status === "aguardando"))} loading={isLoading} />
        <KpiCard title="Vencidas" value={formatBRL(sum((e) => e.status === "vencida"))} loading={isLoading} />
        <KpiCard title="Pagas" value={formatBRL(sum((e) => e.status === "paga"))} loading={isLoading} />
        <KpiCard title="Vencem em 7 dias" value={String(soon)} loading={isLoading} hint="Despesas aguardando com vencimento nos próximos 7 dias." />
      </div>

      <Card className="rounded-2xl border-border shadow-none p-4 flex flex-wrap gap-3 items-end">
        <F label="Ano"><Input type="number" className="h-9 w-[90px]" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} /></F>
        <F label="Mês de vencimento">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos</SelectItem>{MONTHS_PT.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos</SelectItem>{Object.entries(STATUS).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Classificação DRE">
          <Select value={dre} onValueChange={setDre}>
            <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todas">Todas</SelectItem>{Object.entries(DRE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <Button className="ml-auto rounded-full" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />Nova despesa</Button>
      </Card>

      <Card className="rounded-2xl border-border shadow-none overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs">Descrição</TableHead>
              <TableHead className="text-xs">Categoria</TableHead>
              <TableHead className="text-xs">DRE</TableHead>
              <TableHead className="text-xs">Vencimento</TableHead>
              <TableHead className="text-xs">Pago em</TableHead>
              <TableHead className="text-xs text-right">Valor</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">{isLoading ? "Carregando…" : "Nenhuma despesa no período."}</TableCell></TableRow>
            )}
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm font-medium">{e.description}</TableCell>
                <TableCell className="text-xs">{e.category}</TableCell>
                <TableCell className="text-xs">{DRE_LABEL[e.dre_classification]}</TableCell>
                <TableCell className="text-xs">{br(e.due_date)}</TableCell>
                <TableCell className="text-xs">{br(e.paid_at)}</TableCell>
                <TableCell className="text-right text-sm font-semibold">{formatBRL(Number(e.amount))}</TableCell>
                <TableCell><Badge variant={STATUS[e.status]?.v ?? "secondary"}>{STATUS[e.status]?.label ?? e.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {e.status !== "paga" && <Button size="sm" variant="outline" onClick={() => pay(e.id)}><Check className="h-3.5 w-3.5 mr-1" />Pagar</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <TaxesCard year={year} month={month === "todos" ? null : Number(month)} />

      <Card className="rounded-2xl border-border shadow-none">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-semibold">Fluxo de caixa mensal — {year}</h2>
          <p className="text-xs text-muted-foreground">Entradas = comissões recebidas · Saídas = despesas pagas</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">Mês</TableHead>
                <TableHead className="text-xs text-right">Entradas</TableHead>
                <TableHead className="text-xs text-right">Saídas</TableHead>
                <TableHead className="text-xs text-right">Resultado</TableHead>
                <TableHead className="text-xs text-right">Saldo acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(flow ?? []).map((m, i) => {
                const res = m.entradas - m.saidas;
                saldo += res;
                return (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{MONTHS_PT[i]}</TableCell>
                    <TableCell className="text-right text-sm">{formatBRL(m.entradas)}</TableCell>
                    <TableCell className="text-right text-sm text-destructive">{formatBRL(m.saidas)}</TableCell>
                    <TableCell className={`text-right text-sm font-semibold ${res < 0 ? "text-destructive" : ""}`}>{formatBRL(res)}</TableCell>
                    <TableCell className={`text-right text-sm ${saldo < 0 ? "text-destructive" : ""}`}>{formatBRL(saldo)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <NewExpenseDialog open={newOpen} onOpenChange={setNewOpen} onSaved={refresh} />
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

function NewExpenseDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const createFn = useServerFn(createExpense);
  const [f, setF] = useState({ description: "", category: "", amount: "", dueDate: "", dre: "despesa_operacional" as DreClass, notes: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    const amount = Number(f.amount.replace(",", "."));
    if (!f.description.trim() || !(amount > 0) || !f.dueDate) return toast.error("Preencha descrição, valor e vencimento");
    setBusy(true);
    try {
      await createFn({ data: { ...f, amount } });
      toast.success("Despesa criada");
      setF({ description: "", category: "", amount: "", dueDate: "", dre: "despesa_operacional", notes: "" });
      onOpenChange(false); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao salvar"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova despesa</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <F label="Descrição"><Input value={f.description} onChange={set("description")} /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Categoria"><Input value={f.category} onChange={set("category")} placeholder="Ex.: Aluguel" /></F>
            <F label="Valor"><Input inputMode="decimal" value={f.amount} onChange={set("amount")} placeholder="0,00" /></F>
            <F label="Vencimento"><Input type="date" value={f.dueDate} onChange={set("dueDate")} /></F>
            <F label="Classificação DRE">
              <Select value={f.dre} onValueChange={(v) => setF({ ...f, dre: v as DreClass })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(DRE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </F>
          </div>
          <F label="Observações"><Input value={f.notes} onChange={set("notes")} /></F>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
