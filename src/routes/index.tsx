import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar, type ModuleKey } from "@/components/shell/TopBar";
import { DashboardModule } from "@/components/modules/DashboardModule";
import { PortfolioModule } from "@/components/modules/PortfolioModule";
import { KanbanModule } from "@/components/modules/KanbanModule";
import { MulticalcModule } from "@/components/modules/MulticalcModule";
import { FinancialModule } from "@/components/modules/FinancialModule";
import { SettingsModule } from "@/components/modules/SettingsModule";
import { PipelineStoreProvider } from "@/lib/pipeline/opportunityStore";
import { QuoteStoreProvider } from "@/lib/multicalc/quoteStore";
import { TaskStoreProvider } from "@/lib/tasks/taskStore";
import { NavigationProvider } from "@/lib/navigation";

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
  const [active, setActive] = useState<ModuleKey>("dashboard");

  return (
    <PipelineStoreProvider>
      <QuoteStoreProvider>
        <TaskStoreProvider>
          <NavigationProvider active={active} setActive={setActive}>
            <div className="min-h-screen bg-background">
              <TopBar active={active} onChange={setActive} />
              <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6 md:py-8">
                {active === "dashboard" && <DashboardModule />}
                {active === "policies" && <PoliciesModule />}
                {active === "kanban" && <KanbanModule />}
                {active === "multicalc" && <MulticalcModule />}
                {active === "financial" && <FinancialModule />}
                {active === "settings" && <SettingsModule />}
              </main>
            </div>
          </NavigationProvider>
        </TaskStoreProvider>
      </QuoteStoreProvider>
    </PipelineStoreProvider>

  );
}
