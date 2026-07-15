import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PoliciesTab } from "@/components/portfolio/PoliciesTab";
import { ClientsTab } from "@/components/portfolio/ClientsTab";
import { ClientDetailDrawer } from "@/components/portfolio/ClientDetailDrawer";
import { PolicyDetailDrawer } from "@/components/portfolio/PolicyDetailDrawer";
import { useClients } from "@/lib/portfolio/clientStore";
import { usePolicies } from "@/lib/portfolio/policyStore";
import type { Policy } from "@/lib/mock/data";

export function PortfolioModule() {
  const [tab, setTab] = useState("policies");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const { clients } = useClients();
  const { policies } = usePolicies();

  const policiesCount = policies.length;
  const clientsCount = clients.length;

  const openClient = (name: string) => setSelectedClient(name);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Carteira</h1>
        <p className="text-sm text-muted-foreground mt-1">Apólices e clientes em um só lugar</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-xl bg-muted">
          <TabsTrigger value="policies" className="rounded-lg">
            Apólices <span className="ml-1.5 text-xs text-muted-foreground">({policiesCount})</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="rounded-lg">
            Clientes <span className="ml-1.5 text-xs text-muted-foreground">({clientsCount})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-5">
          <PoliciesTab onClientClick={openClient} />
        </TabsContent>
        <TabsContent value="clients" className="mt-5">
          <ClientsTab onSelectClient={openClient} />
        </TabsContent>
      </Tabs>

      <ClientDetailDrawer
        clientName={selectedClient}
        onOpenChange={(o) => !o && setSelectedClient(null)}
        onOpenPolicy={(p) => {
          setSelectedClient(null);
          setSelectedPolicy(p);
        }}
      />

      <PolicyDetailDrawer
        policy={selectedPolicy}
        onOpenChange={(o) => !o && setSelectedPolicy(null)}
        onSelectPolicy={(p) => setSelectedPolicy(p)}
      />
    </div>
  );
}
