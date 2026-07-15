import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type CategoryKind = "custo_operacional" | "despesa_operacional";

// Heurística inicial baseada nas categorias já usadas no cashStore.
const DEFAULT_CATEGORY_KIND: Record<string, CategoryKind> = {
  Aluguel: "custo_operacional",
  Software: "custo_operacional",
  Infra: "custo_operacional",
  Infraestrutura: "custo_operacional",
  Marketing: "despesa_operacional",
  Viagens: "despesa_operacional",
  Outros: "despesa_operacional",
};

function classifyCategory(
  category: string,
  overrides: Record<string, CategoryKind>,
): CategoryKind {
  if (overrides[category]) return overrides[category];
  if (DEFAULT_CATEGORY_KIND[category]) return DEFAULT_CATEGORY_KIND[category];
  // fallback: despesa operacional
  return "despesa_operacional";
}

type Ctx = {
  categoryKind: Record<string, CategoryKind>;
  setCategoryKind: (cat: string, kind: CategoryKind) => void;
  resetDefaults: () => void;
  classify: (category: string) => CategoryKind;
};

const DreConfigContext = createContext<Ctx | null>(null);

export function DreConfigProvider({ children }: { children: ReactNode }) {
  const [categoryKind, setCategoryKindState] = useState<Record<string, CategoryKind>>({});

  const setCategoryKind = useCallback((cat: string, kind: CategoryKind) => {
    setCategoryKindState((p) => ({ ...p, [cat]: kind }));
  }, []);

  const resetDefaults = useCallback(() => {
    setCategoryKindState({});
  }, []);

  const classify = useCallback(
    (category: string) => classifyCategory(category, categoryKind),
    [categoryKind],
  );

  const value = useMemo<Ctx>(
    () => ({ categoryKind, setCategoryKind, resetDefaults, classify }),
    [categoryKind, setCategoryKind, resetDefaults, classify],
  );

  return <DreConfigContext.Provider value={value}>{children}</DreConfigContext.Provider>;
}

export function useDreConfig() {
  const ctx = useContext(DreConfigContext);
  if (!ctx) throw new Error("useDreConfig must be used inside DreConfigProvider");
  return ctx;
}
