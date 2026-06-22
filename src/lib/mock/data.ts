// Mock data para vitrine TheInsuranceOS
export type PolicyStatus = "ativa" | "vencida" | "pendente" | "cancelada" | "renovada";
export type Branch = "Auto" | "Vida" | "Residencial" | "Empresarial" | "Saúde" | "Consórcio";
export type Insurer = "Porto Seguro" | "Bradesco" | "SulAmérica" | "Allianz" | "Mapfre";

export type ClientStatus = "ativo" | "inativo" | "lead";
export type Client = { id: string; name: string; email: string; phone: string; document: string; birthDate?: string; statusOverride?: ClientStatus };

export type BeneficiaryTitle = "titular" | "conjuge" | "filho" | "pai_mae" | "irmao" | "parente" | "outro";
export type Beneficiary = {
  id: string;
  title: BeneficiaryTitle;
  titleCustom?: string;
  name: string;
  birthDate: string;
  cpf: string;
};

export type CommissionScheme = "agenciamento" | "esgotamento" | "parcela" | "unica";
export type CommissionKind = "agenciamento" | "recorrencia" | "esgotamento" | "parcela" | "unica";

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
  renewedFromId?: string;
  renewedToId?: string;
  commissionPct?: number;
  // Comissionamento (overrides do padrão da seguradora)
  commissionScheme?: CommissionScheme;
  commissionInstallments?: number;     // p/ scheme "parcela" (Auto)
  agenciamentoSchedule?: number[];     // p/ Saúde (ex: [1, 0.5, 0.3, 0.2])
  recorrenciaPct?: number;             // p/ Saúde (ex: 0.03)
  comissaoLiquida?: boolean;           // override por apólice
  taxaImposto?: number;
  // Saúde
  healthAnniversary?: string;
  healthInitialValue?: number;
  healthCategory?: string;
  healthCoparticipation?: boolean;
  beneficiaries?: Beneficiary[];
  // Consórcio
  consortiumGroup?: string;
  consortiumQuota?: string;
};

export type KanbanStage = "lead" | "cotacao" | "negociacao" | "fechado" | "perdido";
export type LostReason = "preco" | "cobertura" | "prazo" | "sem-retorno" | "outro";
export const lostReasonLabel: Record<LostReason, string> = {
  preco: "Preço",
  cobertura: "Cobertura",
  prazo: "Prazo",
  "sem-retorno": "Sem retorno",
  outro: "Outro",
};
export type Task = {
  id: string;
  title: string;
  clientName: string;
  branch: Branch;
  estimatedValue: number;
  dueDate: string;
  assignee: string;
  stage: KanbanStage;
  quoteGroupId?: string;
  lostReason?: LostReason;
  lostNote?: string;
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
  policyId?: string;
  kind?: CommissionKind;
  installmentIndex?: number;
  installmentTotal?: number;
};
export type TeamMember = { id: string; name: string; role: string; email: string };

const insurers: Insurer[] = ["Porto Seguro", "Bradesco", "SulAmérica", "Allianz", "Mapfre"];
const branches: Branch[] = ["Auto", "Vida", "Residencial", "Empresarial", "Saúde", "Consórcio"];
const names = [
  "Ana Souza", "Carlos Lima", "Mariana Alves", "João Pereira", "Beatriz Costa",
  "Rafael Mendes", "Juliana Rocha", "Pedro Henrique", "Larissa Dias", "Bruno Carvalho",
  "Camila Ferreira", "Diego Santos", "Fernanda Nunes", "Gustavo Moreira", "Helena Ribeiro",
  "Igor Almeida", "Patrícia Cardoso", "Lucas Barros", "Renata Silva", "Marcelo Pinto",
  "Vanessa Teixeira", "Thiago Castro", "Aline Cavalcanti", "Ricardo Monteiro", "Sofia Andrade",
];

const rand = <T,>(arr: T[], i: number) => arr[i % arr.length];
const pad = (n: number) => String(n).padStart(4, "0");

export const clients: Client[] = names.map((n, i) => {
  const year = 1960 + ((i * 13) % 41); // 1960..2000
  const month = ((i * 7) % 12) + 1;
  const day = ((i * 11) % 27) + 1;
  const birthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    id: `c${i + 1}`,
    name: n,
    email: `${n.toLowerCase().replace(/\s+/g, ".")}@email.com`,
    phone: `(11) 9${String(10000000 + i * 137).slice(0, 8)}`,
    document: `${String(100000000 + i * 7919).slice(0, 9)}-${String((i * 31) % 100).padStart(2, "0")}`,
    birthDate,
  };
});

const statuses: PolicyStatus[] = ["ativa", "ativa", "ativa", "pendente", "vencida", "cancelada"];

// Helpers para o seed
const today = new Date();
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const monthsAgo = (n: number) => { const d = new Date(today); d.setMonth(d.getMonth() - n); return d; };

// Apólices "curadas" que demonstram os 3 modelos de comissionamento
const curatedPolicies: Policy[] = [
  // 1) Saúde — agenciamento em andamento (começou há 2 meses)
  {
    id: "p-saude-1",
    number: "APO-2026-0001",
    clientName: "Mariana Alves",
    branch: "Saúde",
    insurer: "SulAmérica",
    premium: 14400, // 1.200/mês x 12
    startDate: ymd(monthsAgo(2)),
    endDate: "",
    status: "ativa",
    healthInitialValue: 1200,
    healthCategory: "Enfermaria",
    healthCoparticipation: true,
    commissionScheme: "agenciamento",
    agenciamentoSchedule: [1.0, 0.5, 0.3, 0.2],
    recorrenciaPct: 0.03,
    comissaoLiquida: false,
  },
  // 2) Auto — Esgotamento (à vista, comissão antecipada)
  {
    id: "p-auto-1",
    number: "APO-2026-0002",
    clientName: "João Pereira",
    branch: "Auto",
    insurer: "Porto Seguro",
    premium: 3200,
    startDate: ymd(monthsAgo(3)),
    endDate: ymd(new Date(today.getFullYear() + 1, today.getMonth() - 3, today.getDate())),
    status: "ativa",
    commissionPct: 18,
    commissionScheme: "esgotamento",
    comissaoLiquida: false,
  },
  // 3) Auto — Por parcela (10x)
  {
    id: "p-auto-2",
    number: "APO-2026-0003",
    clientName: "Beatriz Costa",
    branch: "Auto",
    insurer: "Bradesco",
    premium: 4800,
    startDate: ymd(monthsAgo(4)),
    endDate: ymd(new Date(today.getFullYear() + 1, today.getMonth() - 4, today.getDate())),
    status: "ativa",
    commissionPct: 20,
    commissionScheme: "parcela",
    commissionInstallments: 10,
    comissaoLiquida: false,
  },
  // 4) Consórcio — modelo simples
  {
    id: "p-cons-1",
    number: "APO-2026-0004",
    clientName: "Rafael Mendes",
    branch: "Consórcio",
    insurer: "Bradesco",
    premium: 60000,
    startDate: ymd(monthsAgo(1)),
    endDate: ymd(new Date(today.getFullYear() + 5, today.getMonth() - 1, today.getDate())),
    status: "ativa",
    commissionPct: 1.5,
    commissionScheme: "unica",
  },
];

// Apólices extras genéricas (para completar a vitrine)
const extraPolicies: Policy[] = Array.from({ length: 20 }, (_, i) => {
  const start = new Date(2025, (i * 2) % 12, 1 + (i % 27));
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  const branch = rand(branches, i);
  return {
    id: `p${i + 5}`,
    number: `APO-2026-${pad(i + 5)}`,
    clientName: rand(names, i),
    branch,
    insurer: rand(insurers, i + 2),
    premium: 800 + (i * 137) % 5400,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    status: rand(statuses, i),
    commissionPct: 15 + (i % 10),
    commissionScheme: branch === "Saúde" ? "agenciamento" : branch === "Consórcio" ? "unica" : "esgotamento",
  };
});

export const policies: Policy[] = [...curatedPolicies, ...extraPolicies];


const stages: KanbanStage[] = ["lead", "cotacao", "negociacao", "fechado"];

// Curated opportunities — first 5 are linked to seeded quote groups (g1..g5 in quoteStore)
const curated: Task[] = [
  {
    id: "t1", title: "Renovação Auto", clientName: "João Silva", branch: "Auto",
    estimatedValue: 1850, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    assignee: "AS", stage: "fechado", quoteGroupId: "g1",
  },
  {
    id: "t2", title: "Seguro de Vida", clientName: "Mariana Alves", branch: "Vida",
    estimatedValue: 1650, dueDate: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10),
    assignee: "CL", stage: "perdido", quoteGroupId: "g2", lostReason: "preco",
  },
  {
    id: "t3", title: "Seguro Residencial — apto", clientName: "Carlos Lima", branch: "Residencial",
    estimatedValue: 1750, dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    assignee: "AS", stage: "negociacao", quoteGroupId: "g3",
  },
  {
    id: "t4", title: "Renovação Auto Corolla", clientName: "Beatriz Costa", branch: "Auto",
    estimatedValue: 1930, dueDate: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
    assignee: "MA", stage: "cotacao", quoteGroupId: "g4",
  },
  {
    id: "t5", title: "PME — Empresarial", clientName: "Rafael Mendes", branch: "Empresarial",
    estimatedValue: 2270, dueDate: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
    assignee: "AS", stage: "cotacao", quoteGroupId: "g5",
  },
];

const extras: Task[] = Array.from({ length: 8 }, (_, i) => {
  const due = new Date();
  due.setDate(due.getDate() + (i * 3 - 5));
  return {
    id: `t${i + 6}`,
    title: `${rand(["Novo lead", "Follow-up", "Proposta"], i)} ${rand(branches, i)}`,
    clientName: rand(names, i + 8),
    branch: rand(branches, i + 1),
    estimatedValue: 1200 + (i * 213) % 6800,
    dueDate: due.toISOString().slice(0, 10),
    assignee: rand(["AS", "CL", "MA", "JP"], i),
    stage: stages[i % 3] as KanbanStage, // lead, cotacao, negociacao
  };
});

export const tasks: Task[] = [...curated, ...extras];

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

export const formatDateShort = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
