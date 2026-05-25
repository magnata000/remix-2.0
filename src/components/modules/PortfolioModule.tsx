import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PoliciesTab } from "@/components/portfolio/PoliciesTab";
import { ClientsTab } from "@/components/portfolio/ClientsTab";
import { DocumentsTab } from "@/components/portfolio/DocumentsTab";
import { ClientDetailDrawer } from "@/components/portfolio/ClientDetailDrawer";
import { clients, policies } from "@/lib/mock/data";
import { useDocumentStore } from "@/lib/documents/documentStore";

export function PortfolioModule() {
  const [tab, setTab] = useState("policies");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [documentsFilter, setDocumentsFilter] = useState<string | null>(null);

  const { files } = useDocumentStore();
  const policiesCount = policies.length;
  const clientsCount = useMemo(() => clients.length, []);
  const docsCount = files.length;

  const openClient = (name: string) => setSelectedClient(name);

  const jumpToDocuments = (clientName: string) => {
    setSelectedClient(null);
    setDocumentsFilter(clientName);
    setTab("documents");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Carteira</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Apólices, clientes e documentos em um só lugar
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-xl bg-muted">
          <TabsTrigger value="policies" className="rounded-lg">
            Apólices <span className="ml-1.5 text-xs text-muted-foreground">({policiesCount})</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="rounded-lg">
            Clientes <span className="ml-1.5 text-xs text-muted-foreground">({clientsCount})</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg">
            Documentos <span className="ml-1.5 text-xs text-muted-foreground">({docsCount})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-5">
          <PoliciesTab onClientClick={openClient} />
        </TabsContent>
        <TabsContent value="clients" className="mt-5">
          <ClientsTab onSelectClient={openClient} />
        </TabsContent>
        <TabsContent value="documents" className="mt-5">
          <DocumentsTab initialClient={documentsFilter} />
        </TabsContent>
      </Tabs>

      <ClientDetailDrawer
        clientName={selectedClient}
        onOpenChange={(o) => !o && setSelectedClient(null)}
        onJumpToDocuments={jumpToDocuments}
      />
    </div>
  );
}
