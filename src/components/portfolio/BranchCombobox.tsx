import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { listBranches, createCatalogItem } from "@/lib/portfolio/portfolio.functions";
import { toast } from "sonner";

/** Combobox criável de ramos: lista os ramos ativos e permite cadastrar um novo na hora. */
export function BranchCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listBranches);
  const createFn = useServerFn(createCatalogItem);
  const { data = [] } = useQuery({ queryKey: ["branches"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const active = data.filter((b) => b.isActive);
  const term = search.trim();
  const exists = data.some((b) => b.name.toLowerCase() === term.toLowerCase());

  const addNew = async () => {
    setSaving(true);
    try {
      const item = await createFn({ data: { kind: "branch", name: term } });
      await qc.invalidateQueries({ queryKey: ["branches"] });
      onChange(item.name);
      toast.success(`Ramo "${item.name}" cadastrado (${item.code})`);
      setOpen(false);
      setSearch("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cadastrar o ramo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          className="mt-1.5 w-full justify-between rounded-xl bg-muted font-normal"
        >
          <span className="truncate">{value || "Selecione"}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command>
          <CommandInput placeholder="Buscar ramo..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Nenhum ramo encontrado</CommandEmpty>
            <CommandGroup>
              {active.map((b) => (
                <CommandItem
                  key={b.id}
                  value={b.name}
                  onSelect={() => {
                    onChange(b.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("h-4 w-4", value === b.name ? "opacity-100" : "opacity-0")}
                  />
                  {b.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {term && !exists && (
              <CommandGroup forceMount>
                <CommandItem
                  forceMount
                  value={`__new__${term}`}
                  disabled={saving}
                  onSelect={addNew}
                >
                  <Plus className="h-4 w-4" />
                  Usar e adicionar novo ramo "{term}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
