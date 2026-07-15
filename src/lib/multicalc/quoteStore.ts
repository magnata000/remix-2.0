import { createContext, useContext, useState, useCallback, useMemo, ReactNode, createElement } from "react";
import { Branch, Insurer, Quote, quotes as baseQuotes, LostReason } from "@/lib/mock/data";

export type QuoteStatus = "aberto" | "ganha" | "perdida" | "expirada";
export type { LostReason };

export type QuoteFormData = {
  cliente: { nome: string; cpf: string; email: string; telefone: string };
  objeto: { tipo: Branch; marcaModelo: string; ano: string; cep: string };
  coberturas: { terceiros: string; carroReserva: string; vidros: string; assistencia24h: string };
};

export type QuoteRecord = {
  id: string;
  groupId: string;
  version: number;
  clientName: string;
  branch: Branch;
  createdAt: string; // ISO
  createdBy: string;
  status: QuoteStatus;
  lostReason?: LostReason;
  lostNote?: string;
  formData: QuoteFormData;
  results: Quote[];
  winnerInsurer: Insurer;
};

// Shared price calculation used by the wizard and by the "Recalcular" shortcut
export function generateResults(form: QuoteFormData): Quote[] {
  const baseFactor =
    (form.coberturas.terceiros === "200.000" ? 1.15 : form.coberturas.terceiros === "50.000" ? 0.85 : 1) *
    (form.coberturas.carroReserva === "Sim" ? 1.05 : 1) *
    (form.coberturas.vidros === "Completo" ? 1.04 : form.coberturas.vidros === "Para-brisa" ? 1.02 : 1) *
    (form.coberturas.assistencia24h === "Sim" ? 1.03 : 1);
  // small jitter so successive recalculations differ slightly
  const jitter = 0.97 + Math.random() * 0.06;
  return baseQuotes.map((q, i) => ({
    ...q,
    price: Math.round(q.price * baseFactor * jitter + i * 17),
  }));
}

export const emptyForm = (): QuoteFormData => ({
  cliente: { nome: "", cpf: "", email: "", telefone: "" },
  objeto: { tipo: "Auto", marcaModelo: "", ano: "", cep: "" },
  coberturas: { terceiros: "100.000", carroReserva: "Sim", vidros: "Completo", assistencia24h: "Sim" },
});

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

// Variants of base quotes to simulate different versions
const variantQuotes = (offset: number, multiplier = 1): Quote[] =>
  baseQuotes.map((q, i) => ({
    ...q,
    price: Math.round((q.price + offset + i * 30) * multiplier),
  }));

const seedRecords = (): QuoteRecord[] => {
  const recs: QuoteRecord[] = [];
  // Group 1 — João Silva, 3 versões, ganha
  const g1 = "g1";
  recs.push({
    id: "q1-1", groupId: g1, version: 1, clientName: "João Silva", branch: "Auto",
    createdAt: daysAgo(20), createdBy: "Ana Souza", status: "ganha",
    formData: {
      cliente: { nome: "João Silva", cpf: "123.456.789-00", email: "joao@email.com", telefone: "(11) 90000-1111" },
      objeto: { tipo: "Auto", marcaModelo: "Honda Civic 2024", ano: "2024", cep: "01310-100" },
      coberturas: { terceiros: "100.000", carroReserva: "Não", vidros: "Para-brisa", assistencia24h: "Sim" },
    },
    results: variantQuotes(0), winnerInsurer: "SulAmérica",
  });
  recs.push({
    id: "q1-2", groupId: g1, version: 2, clientName: "João Silva", branch: "Auto",
    createdAt: daysAgo(18), createdBy: "Ana Souza", status: "ganha",
    formData: {
      cliente: { nome: "João Silva", cpf: "123.456.789-00", email: "joao@email.com", telefone: "(11) 90000-1111" },
      objeto: { tipo: "Auto", marcaModelo: "Honda Civic 2024", ano: "2024", cep: "01310-100" },
      coberturas: { terceiros: "200.000", carroReserva: "Sim", vidros: "Completo", assistencia24h: "Sim" },
    },
    results: variantQuotes(180), winnerInsurer: "SulAmérica",
  });
  recs.push({
    id: "q1-3", groupId: g1, version: 3, clientName: "João Silva", branch: "Auto",
    createdAt: daysAgo(15), createdBy: "Carlos Lima", status: "ganha",
    formData: {
      cliente: { nome: "João Silva", cpf: "123.456.789-00", email: "joao@email.com", telefone: "(11) 90000-1111" },
      objeto: { tipo: "Auto", marcaModelo: "Honda Civic 2024", ano: "2024", cep: "04543-000" },
      coberturas: { terceiros: "200.000", carroReserva: "Sim", vidros: "Completo", assistencia24h: "Sim" },
    },
    results: variantQuotes(60, 0.95), winnerInsurer: "Porto Seguro",
  });
  // Group 2 — Mariana Alves, 2 versões, perdida
  const g2 = "g2";
  recs.push({
    id: "q2-1", groupId: g2, version: 1, clientName: "Mariana Alves", branch: "Vida",
    createdAt: daysAgo(10), createdBy: "Mariana Alves", status: "perdida", lostReason: "preco",
    formData: {
      cliente: { nome: "Mariana Alves", cpf: "987.654.321-00", email: "mariana@email.com", telefone: "(11) 91111-2222" },
      objeto: { tipo: "Vida", marcaModelo: "—", ano: "—", cep: "01415-001" },
      coberturas: { terceiros: "50.000", carroReserva: "Não", vidros: "Não", assistencia24h: "Não" },
    },
    results: variantQuotes(-200), winnerInsurer: "Bradesco",
  });
  recs.push({
    id: "q2-2", groupId: g2, version: 2, clientName: "Mariana Alves", branch: "Vida",
    createdAt: daysAgo(8), createdBy: "Carlos Lima", status: "perdida", lostReason: "preco",
    formData: {
      cliente: { nome: "Mariana Alves", cpf: "987.654.321-00", email: "mariana@email.com", telefone: "(11) 91111-2222" },
      objeto: { tipo: "Vida", marcaModelo: "—", ano: "—", cep: "01415-001" },
      coberturas: { terceiros: "100.000", carroReserva: "Não", vidros: "Não", assistencia24h: "Sim" },
    },
    results: variantQuotes(120), winnerInsurer: "Bradesco",
  });
  // Group 3 — Carlos Lima, 1 versão, em aberto recente
  recs.push({
    id: "q3-1", groupId: "g3", version: 1, clientName: "Carlos Lima", branch: "Residencial",
    createdAt: daysAgo(3), createdBy: "Ana Souza", status: "aberto",
    formData: {
      cliente: { nome: "Carlos Lima", cpf: "111.222.333-44", email: "carlos@email.com", telefone: "(11) 92222-3333" },
      objeto: { tipo: "Residencial", marcaModelo: "Apartamento 80m²", ano: "—", cep: "05428-002" },
      coberturas: { terceiros: "100.000", carroReserva: "Não", vidros: "Não", assistencia24h: "Sim" },
    },
    results: variantQuotes(-100), winnerInsurer: "Porto Seguro",
  });
  // Group 4 — Beatriz Costa, 2 versões, expirada (em aberto > 30d)
  recs.push({
    id: "q4-1", groupId: "g4", version: 1, clientName: "Beatriz Costa", branch: "Auto",
    createdAt: daysAgo(50), createdBy: "Mariana Alves", status: "aberto",
    formData: {
      cliente: { nome: "Beatriz Costa", cpf: "222.333.444-55", email: "bia@email.com", telefone: "(11) 93333-4444" },
      objeto: { tipo: "Auto", marcaModelo: "Toyota Corolla 2022", ano: "2022", cep: "04094-050" },
      coberturas: { terceiros: "100.000", carroReserva: "Sim", vidros: "Completo", assistencia24h: "Sim" },
    },
    results: variantQuotes(80), winnerInsurer: "Allianz",
  });
  recs.push({
    id: "q4-2", groupId: "g4", version: 2, clientName: "Beatriz Costa", branch: "Auto",
    createdAt: daysAgo(45), createdBy: "Mariana Alves", status: "aberto",
    formData: {
      cliente: { nome: "Beatriz Costa", cpf: "222.333.444-55", email: "bia@email.com", telefone: "(11) 93333-4444" },
      objeto: { tipo: "Auto", marcaModelo: "Toyota Corolla 2022", ano: "2022", cep: "04094-050" },
      coberturas: { terceiros: "200.000", carroReserva: "Sim", vidros: "Completo", assistencia24h: "Sim" },
    },
    results: variantQuotes(220), winnerInsurer: "Allianz",
  });
  // Group 5 — Rafael Mendes, em aberto (1v)
  recs.push({
    id: "q5-1", groupId: "g5", version: 1, clientName: "Rafael Mendes", branch: "Empresarial",
    createdAt: daysAgo(5), createdBy: "Ana Souza", status: "aberto",
    formData: {
      cliente: { nome: "Rafael Mendes", cpf: "333.444.555-66", email: "rafael@email.com", telefone: "(11) 94444-5555" },
      objeto: { tipo: "Empresarial", marcaModelo: "PME — comércio", ano: "—", cep: "01310-200" },
      coberturas: { terceiros: "200.000", carroReserva: "Não", vidros: "Não", assistencia24h: "Sim" },
    },
    results: variantQuotes(420), winnerInsurer: "Mapfre",
  });
  return recs;
};

// Compute effective status (apply expiration on the fly)
export const effectiveStatus = (r: QuoteRecord, allInGroup: QuoteRecord[]): QuoteStatus => {
  if (r.status !== "aberto") return r.status;
  // Only the latest version in a group is "active"
  const latest = allInGroup.reduce((a, b) => (b.version > a.version ? b : a));
  if (latest.id !== r.id) return r.status; // older versions keep "aberto" badge
  const ageDays = (Date.now() - new Date(r.createdAt).getTime()) / 86400000;
  return ageDays > 10 ? "expirada" : "aberto";
};

type FieldDiff = { field: string; label: string; from: string; to: string };

const FIELD_LABELS: Record<string, string> = {
  "cliente.nome": "Nome", "cliente.cpf": "CPF", "cliente.email": "E-mail", "cliente.telefone": "Telefone",
  "objeto.tipo": "Tipo", "objeto.marcaModelo": "Marca/Modelo", "objeto.ano": "Ano", "objeto.cep": "CEP",
  "coberturas.terceiros": "Terceiros", "coberturas.carroReserva": "Carro reserva",
  "coberturas.vidros": "Vidros", "coberturas.assistencia24h": "Assistência 24h",
};

export const computeDiff = (a: QuoteFormData, b: QuoteFormData): FieldDiff[] => {
  const diffs: FieldDiff[] = [];
  (Object.keys(FIELD_LABELS) as string[]).forEach((path) => {
    const [g, k] = path.split(".") as [keyof QuoteFormData, string];
    // @ts-expect-error dynamic
    const va = String(a[g][k] ?? "");
    // @ts-expect-error dynamic
    const vb = String(b[g][k] ?? "");
    if (va !== vb) diffs.push({ field: path, label: FIELD_LABELS[path], from: va, to: vb });
  });
  return diffs;
};

type Ctx = {
  records: QuoteRecord[];
  groups: { groupId: string; clientName: string; branch: Branch; versions: QuoteRecord[]; latest: QuoteRecord; status: QuoteStatus }[];
  addNewQuote: (data: QuoteFormData, results: Quote[], winner: Insurer, createdBy?: string) => QuoteRecord;
  addVersion: (groupId: string, data: QuoteFormData, results: Quote[], winner: Insurer, createdBy?: string) => QuoteRecord;
  setStatus: (groupId: string, status: QuoteStatus, lostReason?: LostReason, lostNote?: string) => void;
  deleteVersion: (versionId: string) => void;
  deleteGroup: (groupId: string) => void;
};

const QuoteStoreContext = createContext<Ctx | null>(null);

export function QuoteStoreProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<QuoteRecord[]>(() => seedRecords());

  const addNewQuote = useCallback((data: QuoteFormData, results: Quote[], winner: Insurer, createdBy = "Ana Souza") => {
    const groupId = `g${Date.now()}`;
    const rec: QuoteRecord = {
      id: `${groupId}-1`, groupId, version: 1,
      clientName: data.cliente.nome || "Cliente sem nome",
      branch: data.objeto.tipo,
      createdAt: new Date().toISOString(),
      createdBy, status: "aberto", formData: data, results, winnerInsurer: winner,
    };
    setRecords((r) => [...r, rec]);
    return rec;
  }, []);

  const addVersion = useCallback((groupId: string, data: QuoteFormData, results: Quote[], winner: Insurer, createdBy = "Ana Souza") => {
    let rec!: QuoteRecord;
    setRecords((r) => {
      const inGroup = r.filter((x) => x.groupId === groupId);
      const nextV = (inGroup.reduce((m, x) => Math.max(m, x.version), 0) || 0) + 1;
      rec = {
        id: `${groupId}-${nextV}`, groupId, version: nextV,
        clientName: data.cliente.nome || inGroup[0]?.clientName || "Cliente",
        branch: data.objeto.tipo,
        createdAt: new Date().toISOString(),
        createdBy, status: "aberto", formData: data, results, winnerInsurer: winner,
      };
      return [...r, rec];
    });
    return rec!;
  }, []);

  const setStatus = useCallback((groupId: string, status: QuoteStatus, lostReason?: LostReason, lostNote?: string) => {
    setRecords((r) => r.map((x) => x.groupId === groupId
      ? {
          ...x,
          status,
          lostReason: status === "perdida" ? lostReason : undefined,
          lostNote: status === "perdida" ? lostNote : undefined,
        }
      : x));
  }, []);

  const deleteVersion = useCallback((versionId: string) => {
    setRecords((r) => r.filter((x) => x.id !== versionId));
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    setRecords((r) => r.filter((x) => x.groupId !== groupId));
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, QuoteRecord[]>();
    records.forEach((r) => {
      if (!map.has(r.groupId)) map.set(r.groupId, []);
      map.get(r.groupId)!.push(r);
    });
    return Array.from(map.entries()).map(([groupId, versions]) => {
      versions.sort((a, b) => a.version - b.version);
      const latest = versions[versions.length - 1];
      return {
        groupId, clientName: latest.clientName, branch: latest.branch,
        versions, latest, status: effectiveStatus(latest, versions),
      };
    }).sort((a, b) => +new Date(b.latest.createdAt) - +new Date(a.latest.createdAt));
  }, [records]);

  const value: Ctx = { records, groups, addNewQuote, addVersion, setStatus, deleteVersion, deleteGroup };
  return createElement(QuoteStoreContext.Provider, { value }, children);
}

export function useQuoteStore() {
  const c = useContext(QuoteStoreContext);
  if (!c) throw new Error("useQuoteStore must be used within QuoteStoreProvider");
  return c;
}
