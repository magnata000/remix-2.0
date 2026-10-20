import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopBar, type ModuleKey } from "@/components/shell/TopBar";
import { DailyModule } from "@/components/modules/DailyModule";
import { PortfolioModule } from "@/components/modules/PortfolioModule";
import { KanbanModule } from "@/components/modules/KanbanModule";
import { MulticalcModule } from "@/components/modules/MulticalcModule";
import { FinancialModule } from "@/components/modules/FinancialModule";
import { SettingsModule } from "@/components/modules/SettingsModule";
import { PipelineStoreProvider } from "@/lib/pipeline/opportunityStore";
import { QuoteStoreProvider } from "@/lib/multicalc/quoteStore";
import { TaskStoreProvider } from "@/lib/tasks/taskStore";
import { DocumentStoreProvider } from "@/lib/documents/documentStore";
import { ClientStoreProvider } from "@/lib/portfolio/clientStore";
import { FollowUpStoreProvider } from "@/lib/portfolio/followUpStore";
import { PolicyStoreProvider } from "@/lib/portfolio/policyStore";
import { CashProvider } from "@/lib/cash/cashStore";
import { CommissionStoreProvider } from "@/lib/financial/commissionStore";
import { CommissionConfigStoreProvider } from "@/lib/financial/commissionConfigStore";
import { SellerCommissionStoreProvider } from "@/lib/financial/sellerCommissionStore";
import { SellerPayoutStoreProvider } from "@/lib/financial/sellerPayoutStore";
import { SlaConfigProvider } from "@/lib/sla/slaConfig";
import { DreConfigProvider } from "@/lib/financial/dreConfigStore";
import { NavigationProvider } from "@/lib/navigation";
import { FEATURES } from "@/lib/featureFlags";
import { RoleProvider, useRole } from "@/lib/auth/roleStore";
import { canAccessModule, defaultModule } from "@/lib/auth/moduleAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Painel — TheInsuranceOS" },
      {
        name: "description",
        content:
          "Operação da corretora: Daily, carteira de clientes e apólices, kanban e financeiro.",
      },
      { property: "og:title", content: "Painel — TheInsuranceOS" },
      {
        property: "og:description",
        content: "O sistema operacional das corretoras de seguros modernas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppRoot,
});

function AppRoot() {
  return (
    <RoleProvider>
      <AppShell />
    </RoleProvider>
  );
}

function AppShell() {
  const { accessStatus, loading } = useRole();
  if (!loading && accessStatus !== "ok") return <AccessGate status={accessStatus} />;
  return <AppModules />;
}

function AccessGate({ status }: { status: "pendente" | "bloqueado" }) {
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">
          {status === "pendente" ? "Acesso aguardando autorização" : "Acesso bloqueado"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {status === "pendente"
            ? "Sua solicitação foi enviada ao administrador. Você poderá entrar assim que ela for aprovada."
            : "Seu acesso foi suspenso pelo administrador da corretora."}
        </p>
        <Button variant="outline" className="rounded-xl" onClick={signOut}>
          Sair
        </Button>
      </div>
    </div>
  );
}

function AppModules() {
  const [rawActive, setActive] = useState<ModuleKey>("dashboard");
  const { pages, loading } = useRole();

  // Guards: Multicálculo desabilitado ou módulo sem permissão caem no fallback.
  const fallback = defaultModule(pages);
  const active: ModuleKey =
    (rawActive === "multicalc" && !FEATURES.multicalc) ||
    (!loading && !canAccessModule(pages, rawActive))
      ? fallback
      : rawActive;

  useEffect(() => {
    if (loading) return;
    if (!canAccessModule(pages, rawActive)) setActive(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, pages.join(",")]);

  return (
    <PipelineStoreProvider>
      <QuoteStoreProvider>
        <TaskStoreProvider>
          <ClientStoreProvider>
            <FollowUpStoreProvider>
              <PolicyStoreProvider>
                <DocumentStoreProvider>
                  <CashProvider>
                    <CommissionConfigStoreProvider>
                      <CommissionStoreProvider>
                        <SellerCommissionStoreProvider>
                          <SellerPayoutStoreProvider>
                            <SlaConfigProvider>
                              <DreConfigProvider>
                                <NavigationProvider active={active} setActive={setActive}>
                                  <div className="min-h-screen bg-background">
                                    <TopBar active={active} onChange={setActive} />
                                    <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6 md:py-8">
                                      {active === "dashboard" && <DailyModule />}
                                      {active === "policies" && <PortfolioModule />}
                                      {active === "kanban" && <KanbanModule />}
                                      {active === "multicalc" && FEATURES.multicalc && (
                                        <MulticalcModule />
                                      )}
                                      {active === "financial" && <FinancialModule />}
                                      {active === "settings" && <SettingsModule />}
                                    </main>
                                  </div>
                                </NavigationProvider>
                              </DreConfigProvider>
                            </SlaConfigProvider>
                          </SellerPayoutStoreProvider>
                        </SellerCommissionStoreProvider>
                      </CommissionStoreProvider>
                    </CommissionConfigStoreProvider>
                  </CashProvider>
                </DocumentStoreProvider>
              </PolicyStoreProvider>
            </FollowUpStoreProvider>
          </ClientStoreProvider>
        </TaskStoreProvider>
      </QuoteStoreProvider>
    </PipelineStoreProvider>
  );
}
