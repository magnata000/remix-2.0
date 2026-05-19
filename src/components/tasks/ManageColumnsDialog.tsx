import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2 } from "lucide-react";
import { COLUMN_PALETTE, useTaskStore } from "@/lib/tasks/taskStore";
import { toast } from "sonner";

export function ManageColumnsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { columns, renameColumn, recolorColumn, addColumn, deleteColumn, tasks } = useTaskStore();
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState(COLUMN_PALETTE[3]);

  const handleAdd = () => {
    if (!newTitle.trim()) { toast.error("Informe um título"); return; }
    addColumn(newTitle, newColor);
    setNewTitle("");
    toast.success("Coluna adicionada");
  };

  const handleDelete = (id: string) => {
    const count = tasks.filter((t) => t.columnId === id).length;
    if (columns.length <= 1) { toast.error("Mantenha pelo menos uma coluna"); return; }
    if (count > 0 && !confirm(`Esta coluna tem ${count} tarefa(s). Elas serão movidas para a primeira coluna. Continuar?`)) return;
    deleteColumn(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Gerenciar etapas</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {columns.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <Swatch color={c.color} onChange={(col) => recolorColumn(c.id, col)} />
              <Input
                value={c.title}
                onChange={(e) => renameColumn(c.id, e.target.value)}
                className="rounded-xl bg-muted border-0"
              />
              <Button variant="ghost" size="icon" className="rounded-lg text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Adicionar nova coluna</p>
            <div className="flex items-center gap-2">
              <Swatch color={newColor} onChange={setNewColor} />
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título" className="rounded-xl bg-muted border-0" />
              <Button onClick={handleAdd} className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Swatch({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-9 w-9 shrink-0 rounded-xl border border-border"
          style={{ background: color }}
          title="Trocar cor"
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-5 gap-1.5">
          {COLUMN_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onChange(c); setOpen(false); }}
              className="h-7 w-7 rounded-lg border border-border transition-transform hover:scale-110"
              style={{ background: c }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
