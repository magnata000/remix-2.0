import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  KanbanSquare,
  Calculator,
  Wallet,
  Settings,
  Bell,
  Search,
  Menu,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export type ModuleKey =
  | "dashboard"
  | "policies"
  | "kanban"
  | "multicalc"
  | "financial"
  | "settings";

export const modules: { key: ModuleKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "policies", label: "Apólices", icon: FileText },
  { key: "kanban", label: "Kanban", icon: KanbanSquare },
  { key: "multicalc", label: "Multicálculo", icon: Calculator },
  { key: "financial", label: "Financeiro", icon: Wallet },
  { key: "settings", label: "Configurações", icon: Settings },
];

export function TopBar({
  active,
  onChange,
}: {
  active: ModuleKey;
  onChange: (k: ModuleKey) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItem = (m: (typeof modules)[number], onClick?: () => void) => {
    const isActive = m.key === active;
    const Icon = m.icon;
    return (
      <button
        key={m.key}
        onClick={() => {
          onChange(m.key);
          onClick?.();
        }}
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
          isActive
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
        <span>{m.label}</span>
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold tracking-tight">
            TheInsurance<span className="text-brand">OS</span>
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="mx-auto hidden lg:flex items-center gap-1">
          {modules.map((m) => navItem(m))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="h-9 w-48 rounded-full pl-9 bg-muted border-0" />
          </div>
          <Button variant="ghost" size="icon" className="rounded-full relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-warning" />
          </Button>
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-brand-soft text-brand-foreground text-xs font-semibold">
                AS
              </AvatarFallback>
            </Avatar>
            <div className="hidden xl:block">
              <p className="text-sm font-semibold leading-tight">Ana Souza</p>
              <p className="text-xs text-muted-foreground leading-tight">Corretora</p>
            </div>
          </div>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border p-4">
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                    <Zap className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <span>
                    TheInsurance<span className="text-brand">OS</span>
                  </span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 p-3">
                {modules.map((m) => {
                  const Icon = m.icon;
                  const isActive = m.key === active;
                  return (
                    <button
                      key={m.key}
                      onClick={() => {
                        onChange(m.key);
                        setMobileOpen(false);
                      }}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition text-left ${
                        isActive
                          ? "bg-foreground text-background"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {m.label}
                      {isActive && (
                        <Badge className="ml-auto bg-brand text-brand-foreground border-0">
                          ativo
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto border-t border-border p-4 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-brand-soft text-brand-foreground font-semibold">
                    AS
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">Ana Souza</p>
                  <p className="text-xs text-muted-foreground">ana@insuranceos.com</p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
