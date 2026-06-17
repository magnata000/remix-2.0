import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CaixaTab } from "@/components/financial/CaixaTab";
import { ReportTab } from "@/components/financial/ReportTab";

export function FinancialModule() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">Caixa, comissões e relatórios analíticos</p>
      </div>

      <Tabs defaultValue="caixa" className="space-y-5">
        <TabsList>
          <TabsTrigger value="caixa">Caixa</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório</TabsTrigger>
        </TabsList>
        <TabsContent value="caixa" className="mt-0">
          <CaixaTab />
        </TabsContent>
        <TabsContent value="relatorio" className="mt-0">
          <ReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
