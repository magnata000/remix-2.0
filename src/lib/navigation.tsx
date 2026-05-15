import { createContext, useContext, useRef, ReactNode, useCallback } from "react";
import type { ModuleKey } from "@/components/shell/TopBar";

type Focus = { quoteGroupId?: string; opportunityId?: string };

type Ctx = {
  active: ModuleKey;
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
  const focusRef = useRef<Focus>({});

  const goTo = useCallback((module: ModuleKey, f?: Focus) => {
    focusRef.current = f ?? {};
    setActive(module);
  }, [setActive]);

  const consumeFocus = useCallback(() => {
    const current = focusRef.current;
    focusRef.current = {};
    return current;
  }, []);

  return (
    <NavigationContext.Provider value={{ active, goTo, consumeFocus }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const c = useContext(NavigationContext);
  if (!c) throw new Error("useNavigation must be used within NavigationProvider");
  return c;
}
