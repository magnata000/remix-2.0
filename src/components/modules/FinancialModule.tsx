import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CaixaTab } from "@/components/financial/CaixaTab";
import { ReportTab } from "@/components/financial/ReportTab";
import { SellerCommissionsTab } from "@/components/financial/SellerCommissionsTab";
import { CommissionsLedgerTab } from "@/components/financial/CommissionsLedgerTab";
import { ExpensesTab } from "@/components/financial/ExpensesTab";
import { useRole } from "@/lib/auth/roleStore";

export function FinancialModule() {
  const { hasPage } = useRole();
  const showCaixa = hasPage("financeiro_comissoes") || hasPage("financeiro_despesas");
  const showRepasses = hasPage("financeiro_comissoes");
  const showReport = hasPage("financeiro_relatorios");
  const showCom = hasPage("financeiro_comissoes");
  const showDesp = hasPage("financeiro_despesas");
  const first = showCom ? "comissoes" : showDesp ? "despesas" : showCaixa ? "caixa" : showRepasses ? "repasses" : "relatorio";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Caixa, comissões, repasses e relatórios analíticos
        </p>
      </div>

      <Tabs defaultValue={first} className="space-y-5">
        <TabsList>
          {showCom && <TabsTrigger value="comissoes">Comissões</TabsTrigger>}
          {showDesp && <TabsTrigger value="despesas">Despesas</TabsTrigger>}
          {showCaixa && <TabsTrigger value="caixa">Caixa</TabsTrigger>}
          {showRepasses && <TabsTrigger value="repasses">Repasses de vendedores</TabsTrigger>}
          {showReport && <TabsTrigger value="relatorio">Relatório</TabsTrigger>}
        </TabsList>
        {showCom && (
          <TabsContent value="comissoes" className="mt-0">
            <CommissionsLedgerTab />
          </TabsContent>
        )}
        {showDesp && (
          <TabsContent value="despesas" className="mt-0">
            <ExpensesTab />
          </TabsContent>
        )}
        {showCaixa && (
          <TabsContent value="caixa" className="mt-0">
            <CaixaTab />
          </TabsContent>
        )}
        {showRepasses && (
          <TabsContent value="repasses" className="mt-0">
            <SellerCommissionsTab />
          </TabsContent>
        )}
        {showReport && (
          <TabsContent value="relatorio" className="mt-0">
            <ReportTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
