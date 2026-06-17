import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";

export type ExpenseRecurrence = "avulsa" | "mensal";

export type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  recurrence: ExpenseRecurrence;
  dueDay?: number;
  notes?: string;
  createdAt: string;
};

export type ExpenseEntry = {
  id: string;
  expenseId: string;
  description: string;
  category: string;
  amount: number;
  paidAt: string;
  notes?: string;
};

export type ManualIncome = {
  id: string;
  description: string;
  source: string;
  amount: number;
  receivedAt: string;
  notes?: string;
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const now = () => new Date().toISOString();

// Seed mock — current year
const Y = new Date().getFullYear();
const iso = (m: number, d: number, h = 10) =>
  new Date(Y, m, d, h, 0, 0).toISOString();

const seedExpenses: Expense[] = [
  { id: "e1", description: "Aluguel do escritório", category: "Aluguel", amount: 4200, recurrence: "mensal", dueDay: 5, createdAt: iso(0, 1), notes: "Sala 802" },
  { id: "e2", description: "Software CRM", category: "Software", amount: 480, recurrence: "mensal", dueDay: 10, createdAt: iso(0, 1) },
  { id: "e3", description: "Campanha de marketing", category: "Marketing", amount: 2500, recurrence: "avulsa", createdAt: iso(new Date().getMonth(), 8) },
];

const seedEntries: ExpenseEntry[] = [
  { id: "n1", expenseId: "e1", description: "Aluguel do escritório", category: "Aluguel", amount: 4200, paidAt: iso(new Date().getMonth(), 5) },
  { id: "n2", expenseId: "e2", description: "Software CRM", category: "Software", amount: 480, paidAt: iso(new Date().getMonth(), 10) },
];

const seedIncomes: ManualIncome[] = [
  { id: "i1", description: "Bônus de performance", source: "Porto Seguro", amount: 1500, receivedAt: iso(new Date().getMonth(), 12) },
];

type Ctx = {
  expenses: Expense[];
  entries: ExpenseEntry[];
  incomes: ManualIncome[];
  addExpense: (data: Omit<Expense, "id" | "createdAt">) => Expense;
  removeExpense: (id: string) => void;
  registerExpenseEntry: (
    expenseId: string,
    input: { amount: number; paidAt?: string; notes?: string }
  ) => ExpenseEntry | null;
  addIncome: (data: Omit<ManualIncome, "id">) => ManualIncome;
  removeIncome: (id: string) => void;
};

const CashContext = createContext<Ctx | null>(null);

export function CashProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>(seedExpenses);
  const [entries, setEntries] = useState<ExpenseEntry[]>(seedEntries);
  const [incomes, setIncomes] = useState<ManualIncome[]>(seedIncomes);

  const addExpense = useCallback((data: Omit<Expense, "id" | "createdAt">) => {
    const exp: Expense = { ...data, id: newId(), createdAt: now() };
    setExpenses((p) => [exp, ...p]);
    return exp;
  }, []);

  const removeExpense = useCallback((id: string) => {
    setExpenses((p) => p.filter((e) => e.id !== id));
    setEntries((p) => p.filter((e) => e.expenseId !== id));
  }, []);

  const registerExpenseEntry = useCallback(
    (expenseId: string, input: { amount: number; paidAt?: string; notes?: string }) => {
      const exp = expenses.find((e) => e.id === expenseId);
      if (!exp) return null;
      const entry: ExpenseEntry = {
        id: newId(),
        expenseId: exp.id,
        description: exp.description,
        category: exp.category,
        amount: input.amount,
        paidAt: input.paidAt ?? now(),
        notes: input.notes,
      };
      setEntries((p) => [entry, ...p]);
      if (input.amount !== exp.amount) {
        setExpenses((p) => p.map((e) => (e.id === exp.id ? { ...e, amount: input.amount } : e)));
      }
      return entry;
    },
    [expenses]
  );

  const addIncome = useCallback((data: Omit<ManualIncome, "id">) => {
    const inc: ManualIncome = { ...data, id: newId() };
    setIncomes((p) => [inc, ...p]);
    return inc;
  }, []);

  const removeIncome = useCallback((id: string) => {
    setIncomes((p) => p.filter((i) => i.id !== id));
  }, []);

  const value = useMemo<Ctx>(
    () => ({ expenses, entries, incomes, addExpense, removeExpense, registerExpenseEntry, addIncome, removeIncome }),
    [expenses, entries, incomes, addExpense, removeExpense, registerExpenseEntry, addIncome, removeIncome]
  );

  return <CashContext.Provider value={value}>{children}</CashContext.Provider>;
}

export function useCashStore() {
  const ctx = useContext(CashContext);
  if (!ctx) throw new Error("useCashStore must be used inside CashProvider");
  return ctx;
}

export const formatDateTimeBR = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
