import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import type { ModuleKey } from "@/components/shell/TopBar";

type Focus = { quoteGroupId?: string; opportunityId?: string };

type Ctx = {
  active: ModuleKey;
  focus: Focus;
  goTo: (module: ModuleKey, focus?: Focus) => void;
  consumeFocus: () => Focus;
};

const NavigationContext = createContext<Ctx | null>(null);

export function NavigationProvider({
  active,
  setActive,
  children,
}: {
  active: ModuleKey;
  setActive: (k: ModuleKey) => void;
  children: ReactNode;
}) {
  const [focus, setFocus] = useState<Focus>({});

  const goTo = useCallback((module: ModuleKey, f?: Focus) => {
    setFocus(f ?? {});
    setActive(module);
  }, [setActive]);

  const consumeFocus = useCallback(() => {
    const current = focus;
    setFocus({});
    return current;
  }, [focus]);

  return (
    <NavigationContext.Provider value={{ active, focus, goTo, consumeFocus }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const c = useContext(NavigationContext);
  if (!c) throw new Error("useNavigation must be used within NavigationProvider");
  return c;
}
