import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
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
import { ensureProfile } from "@/lib/auth/profile.functions";

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
  component: AppShell,
});

function AppShell() {
  const [rawActive, setActive] = useState<ModuleKey>("dashboard");
  const bootstrapProfile = useServerFn(ensureProfile);

  useEffect(() => {
    void bootstrapProfile();
  }, [bootstrapProfile]);

  // Guard: se Multicálculo está desabilitado, força fallback para dashboard.
  const active: ModuleKey =
    rawActive === "multicalc" && !FEATURES.multicalc ? "dashboard" : rawActive;

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
