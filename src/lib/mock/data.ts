// Mock data para vitrine TheInsuranceOS
export type PolicyStatus = "ativa" | "vencida" | "pendente" | "cancelada";
export type Branch = "Auto" | "Vida" | "Residencial" | "Empresarial" | "Saúde";
export type Insurer = "Porto Seguro" | "Bradesco" | "SulAmérica" | "Allianz" | "Mapfre";

export type Client = { id: string; name: string; email: string; phone: string; document: string };
export type Policy = {
  id: string;
  number: string;
  clientName: string;
  branch: Branch;
  insurer: Insurer;
  premium: number;
  startDate: string;
  endDate: string;
  status: PolicyStatus;
};
export type KanbanStage = "lead" | "cotacao" | "negociacao" | "fechado";
export type Task = {
  id: string;
  title: string;
  clientName: string;
  branch: Branch;
  estimatedValue: number;
  dueDate: string;
  assignee: string;
  stage: KanbanStage;
};
export type Quote = {
  insurer: Insurer;
  price: number;
  deductible: number;
  coverages: string[];
  rating: number;
};
export type Commission = {
  id: string;
  policyNumber: string;
  clientName: string;
  insurer: Insurer;
  amount: number;
  dueDate: string;
  status: "pago" | "pendente" | "atrasado";
};
export type TeamMember = { id: string; name: string; role: string; email: string };

const insurers: Insurer[] = ["Porto Seguro", "Bradesco", "SulAmérica", "Allianz", "Mapfre"];
const branches: Branch[] = ["Auto", "Vida", "Residencial", "Empresarial", "Saúde"];
const names = [
  "Ana Souza", "Carlos Lima", "Mariana Alves", "João Pereira", "Beatriz Costa",
  "Rafael Mendes", "Juliana Rocha", "Pedro Henrique", "Larissa Dias", "Bruno Carvalho",
  "Camila Ferreira", "Diego Santos", "Fernanda Nunes", "Gustavo Moreira", "Helena Ribeiro",
  "Igor Almeida", "Patrícia Cardoso", "Lucas Barros", "Renata Silva", "Marcelo Pinto",
  "Vanessa Teixeira", "Thiago Castro", "Aline Cavalcanti", "Ricardo Monteiro", "Sofia Andrade",
];

const rand = <T,>(arr: T[], i: number) => arr[i % arr.length];
const pad = (n: number) => String(n).padStart(4, "0");

export const clients: Client[] = names.map((n, i) => ({
  id: `c${i + 1}`,
  name: n,
  email: `${n.toLowerCase().replace(/\s+/g, ".")}@email.com`,
  phone: `(11) 9${String(10000000 + i * 137).slice(0, 8)}`,
  document: `${String(100000000 + i * 7919).slice(0, 9)}-${String((i * 31) % 100).padStart(2, "0")}`,
}));

const statuses: PolicyStatus[] = ["ativa", "ativa", "ativa", "pendente", "vencida", "cancelada"];

export const policies: Policy[] = Array.from({ length: 24 }, (_, i) => {
  const start = new Date(2025, (i * 2) % 12, 1 + (i % 27));
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return {
    id: `p${i + 1}`,
    number: `APO-2026-${pad(i + 1)}`,
    clientName: rand(names, i),
    branch: rand(branches, i),
    insurer: rand(insurers, i + 2),
    premium: 800 + (i * 137) % 5400,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    status: rand(statuses, i),
  };
});

const stages: KanbanStage[] = ["lead", "cotacao", "negociacao", "fechado"];

export const tasks: Task[] = Array.from({ length: 16 }, (_, i) => {
  const due = new Date();
  due.setDate(due.getDate() + (i * 3 - 5));
  return {
    id: `t${i + 1}`,
    title: `${rand(["Renovação", "Nova cotação", "Follow-up", "Proposta"], i)} ${rand(branches, i)}`,
    clientName: rand(names, i + 3),
    branch: rand(branches, i + 1),
    estimatedValue: 1200 + (i * 213) % 7800,
    dueDate: due.toISOString().slice(0, 10),
    assignee: rand(["AS", "CL", "MA", "JP"], i),
    stage: stages[i % stages.length],
  };
});

export const quotes: Quote[] = insurers.map((ins, i) => ({
  insurer: ins,
  price: 1850 + i * 240 - (i === 2 ? 320 : 0),
  deductible: 1500 + i * 200,
  coverages: ["Casco", "Terceiros 100k", "APP", "Carro reserva", i % 2 === 0 ? "Vidros" : "Assistência 24h"],
  rating: 4 + ((i * 17) % 10) / 10,
}));

export const commissions: Commission[] = Array.from({ length: 18 }, (_, i) => {
  const due = new Date();
  due.setDate(due.getDate() + (i * 5 - 30));
  return {
    id: `cm${i + 1}`,
    policyNumber: `APO-2026-${pad((i % 24) + 1)}`,
    clientName: rand(names, i),
    insurer: rand(insurers, i),
    amount: 180 + (i * 73) % 1400,
    dueDate: due.toISOString().slice(0, 10),
    status: rand(["pago", "pago", "pendente", "atrasado"] as const, i),
  };
});

export const team: TeamMember[] = [
  { id: "u1", name: "Ana Souza", role: "Sócia / Corretora", email: "ana@insuranceos.com" },
  { id: "u2", name: "Carlos Lima", role: "Corretor Sênior", email: "carlos@insuranceos.com" },
  { id: "u3", name: "Mariana Alves", role: "Atendimento", email: "mariana@insuranceos.com" },
  { id: "u4", name: "João Pereira", role: "Financeiro", email: "joao@insuranceos.com" },
];

export const salesByMonth = [
  { month: "Jan", vendas: 18, receita: 22000 },
  { month: "Fev", vendas: 22, receita: 28000 },
  { month: "Mar", vendas: 19, receita: 24000 },
  { month: "Abr", vendas: 27, receita: 33000 },
  { month: "Mai", vendas: 31, receita: 38000 },
  { month: "Jun", vendas: 25, receita: 30000 },
  { month: "Jul", vendas: 34, receita: 41000 },
  { month: "Ago", vendas: 42, receita: 52000 },
  { month: "Set", vendas: 29, receita: 36000 },
  { month: "Out", vendas: 33, receita: 40000 },
  { month: "Nov", vendas: 38, receita: 47000 },
  { month: "Dez", vendas: 36, receita: 45000 },
];

export const insurerLogos: Record<Insurer, string> = {
  "Porto Seguro": "PS",
  Bradesco: "BR",
  SulAmérica: "SA",
  Allianz: "AL",
  Mapfre: "MP",
};

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
