import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, FolderOpen } from "lucide-react";
import { policies } from "@/lib/mock/data";
import { useDocumentStore } from "@/lib/documents/documentStore";
import { FolderTree } from "@/components/documents/FolderTree";
import { cn } from "@/lib/utils";

type Props = {
  initialClient?: string | null;
};

export function DocumentsTab({ initialClient }: Props) {
  const store = useDocumentStore();
  const [q, setQ] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(initialClient ?? null);

  useEffect(() => {
    if (initialClient) setSelectedClient(initialClient);
  }, [initialClient]);

  const clientGroups = useMemo(() => {
    const map = new Map<string, { client: string; policyCount: number; fileCount: number }>();
    policies.forEach((p) => {
      const cur = map.get(p.clientName) ?? { client: p.clientName, policyCount: 0, fileCount: 0 };
      cur.policyCount += 1;
      cur.fileCount += store.countByPolicy(p.id);
      map.set(p.clientName, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.client.localeCompare(b.client));
  }, [store]);

  const filteredClients = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clientGroups;
    return clientGroups.filter((c) => c.client.toLowerCase().includes(t));
  }, [clientGroups, q]);

  // Garantir cliente selecionado válido
  useEffect(() => {
    if (!selectedClient && filteredClients.length > 0) {
      setSelectedClient(filteredClients[0].client);
    }
  }, [filteredClients, selectedClient]);

  const rootFolders = useMemo(() => {
    if (!selectedClient) return [];
    return policies
      .filter((p) => p.clientName === selectedClient)
      .map((p) => store.rootFolderOf(p.id))
      .filter((f): f is NonNullable<ReturnType<typeof store.rootFolderOf>> => !!f);
  }, [selectedClient, store]);

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Lista de clientes */}
      <Card className="p-3 rounded-2xl border-border shadow-none flex flex-col">
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 rounded-xl bg-muted border-0 h-9"
          />
        </div>
        <div className="overflow-y-auto max-h-[600px] -mx-1 px-1 space-y-0.5">
          {filteredClients.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhum cliente encontrado.
            </p>
          ) : (
            filteredClients.map((c) => {
              const active = c.client === selectedClient;
              return (
                <button
                  key={c.client}
                  onClick={() => setSelectedClient(c.client)}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-2 transition flex items-center justify-between gap-2",
                    active ? "bg-brand/15 text-foreground" : "hover:bg-muted/60",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.client}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.policyCount} apólice{c.policyCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {c.fileCount}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* Painel da árvore */}
      <div>
        {!selectedClient ? (
          <Card className="p-12 rounded-2xl border-border shadow-none text-center">
            <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-3 font-medium">Selecione um cliente</p>
            <p className="text-sm text-muted-foreground">
              Veja a árvore de pastas e arquivos por apólice.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-semibold">{selectedClient}</h3>
              <span className="text-xs text-muted-foreground">
                {rootFolders.length} apólice{rootFolders.length === 1 ? "" : "s"}
              </span>
            </div>
            <FolderTree rootFolders={rootFolders} />
          </div>
        )}
      </div>
    </div>
  );
}
