import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { PolicyStoreProvider } from "@/lib/portfolio/policyStore";
import { CashProvider } from "@/lib/cash/cashStore";
import { CommissionStoreProvider } from "@/lib/financial/commissionStore";
import { CommissionConfigStoreProvider } from "@/lib/financial/commissionConfigStore";
import { SellerCommissionStoreProvider } from "@/lib/financial/sellerCommissionStore";
import { SlaConfigProvider } from "@/lib/sla/slaConfig";
import { DreConfigProvider } from "@/lib/financial/dreConfigStore";

import { NavigationProvider } from "@/lib/navigation";
import { FEATURES } from "@/lib/featureFlags";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TheInsuranceOS — Sistema operacional para corretoras" },
      {
        name: "description",
        content:
          "Vitrine interativa do TheInsuranceOS: dashboard, apólices, kanban, multicálculo e financeiro em um só lugar.",
      },
      { property: "og:title", content: "TheInsuranceOS" },
      {
        property: "og:description",
        content: "O sistema operacional das corretoras de seguros modernas.",
      },
    ],
  }),
  component: AppShell,
});

function AppShell() {
  const [rawActive, setActive] = useState<ModuleKey>("dashboard");
  // Guard: se Multicálculo está desabilitado, força fallback para dashboard.
  const active: ModuleKey = rawActive === "multicalc" && !FEATURES.multicalc ? "dashboard" : rawActive;

  return (
    <PipelineStoreProvider>
      <QuoteStoreProvider>
        <TaskStoreProvider>
          <ClientStoreProvider>
            <PolicyStoreProvider>
              <DocumentStoreProvider>
                <CashProvider>
                  <CommissionConfigStoreProvider>
                    <CommissionStoreProvider>
                      <SellerCommissionStoreProvider>
                        <SlaConfigProvider>
                        <DreConfigProvider>
                        <NavigationProvider active={active} setActive={setActive}>
                          <div className="min-h-screen bg-background">
                            <TopBar active={active} onChange={setActive} />
                            <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6 md:py-8">
                              {active === "dashboard" && <DailyModule />}
                              {active === "policies" && <PortfolioModule />}
                              {active === "kanban" && <KanbanModule />}
                              {active === "multicalc" && FEATURES.multicalc && <MulticalcModule />}
                              {active === "financial" && <FinancialModule />}
                              {active === "settings" && <SettingsModule />}
                            </main>
                          </div>
                        </NavigationProvider>
                        </DreConfigProvider>
                        </SlaConfigProvider>
                      </SellerCommissionStoreProvider>
                    </CommissionStoreProvider>
                  </CommissionConfigStoreProvider>
                </CashProvider>
              </DocumentStoreProvider>
            </PolicyStoreProvider>
          </ClientStoreProvider>
        </TaskStoreProvider>
      </QuoteStoreProvider>
    </PipelineStoreProvider>

  );
}
