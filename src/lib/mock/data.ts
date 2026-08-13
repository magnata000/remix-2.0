// Mock data para vitrine TheInsuranceOS
export type PolicyStatus = "ativa" | "vencida" | "pendente" | "cancelada" | "renovada";
export type Branch = "Auto" | "Vida" | "Residencial" | "Empresarial" | "Saúde" | "Consórcio";
export type Insurer = "Porto Seguro" | "Bradesco" | "SulAmérica" | "Allianz" | "Mapfre";

export type ClientStatus = "ativo" | "inativo" | "lead";
export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  birthDate?: string;
  statusOverride?: ClientStatus;
};

export type FollowUpType = "ligacao" | "email" | "whatsapp" | "reuniao" | "videocall" | "nota";
export type FollowUpStatus = "agendado" | "realizado" | "cancelado" | "adiado";
export type FollowUp = {
  id: string;
  clientId: string;
  clientName: string;
  date: string; // ISO date
  time?: string; // HH:MM
  type: FollowUpType;
  status: FollowUpStatus;
  notes: string;
  createdTaskId?: string;
  createdAt: string;
  updatedAt: string;
};


export type BeneficiaryTitle =
  | "titular"
  | "conjuge"
  | "filho"
  | "pai_mae"
  | "irmao"
  | "parente"
  | "outro";
export type Beneficiary = {
  id: string;
  title: BeneficiaryTitle;
  titleCustom?: string;
  name: string;
  birthDate: string;
  cpf: string;
};

export type CommissionScheme = "agenciamento" | "esgotamento" | "parcela" | "unica" | "vitalicio";
export type CommissionKind =
  | "agenciamento"
  | "recorrencia"
  | "esgotamento"
  | "parcela"
  | "unica"
  | "vitalicio";

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
  commissionInstallments?: number; // p/ scheme "parcela" (Auto)
  agenciamentoSchedule?: number[]; // p/ Saúde (ex: [1, 0.5, 0.3, 0.2])
  recorrenciaPct?: number; // p/ Saúde (ex: 0.03)
  comissaoLiquida?: boolean; // override por apólice
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
  consortiumType?: "Imóvel" | "Auto";
  assigneeId?: string;
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
export type CommissionStatusValue = "pago" | "pendente" | "atrasado" | "devolvido" | "cancelada";
export type Commission = {
  id: string;
  policyNumber: string;
  clientName: string;
  insurer: Insurer;
  amount: number;
  dueDate: string;
  status: CommissionStatusValue;
  policyId?: string;
  kind?: CommissionKind;
  installmentIndex?: number;
  installmentTotal?: number;
  paidAt?: string;
  refundedAt?: string;
  refundReason?: string;
};
type TeamMember = { id: string; name: string; role: string; email: string };

const insurers: Insurer[] = ["Porto Seguro", "Bradesco", "SulAmérica", "Allianz", "Mapfre"];
const branches: Branch[] = ["Auto", "Vida", "Residencial", "Empresarial", "Saúde", "Consórcio"];
const names = [
  "Ana Souza",
  "Carlos Lima",
  "Mariana Alves",
  "João Pereira",
  "Beatriz Costa",
  "Rafael Mendes",
  "Juliana Rocha",
  "Pedro Henrique",
  "Larissa Dias",
  "Bruno Carvalho",
  "Camila Ferreira",
  "Diego Santos",
  "Fernanda Nunes",
  "Gustavo Moreira",
  "Helena Ribeiro",
  "Igor Almeida",
  "Patrícia Cardoso",
  "Lucas Barros",
  "Renata Silva",
  "Marcelo Pinto",
  "Vanessa Teixeira",
  "Thiago Castro",
  "Aline Cavalcanti",
  "Ricardo Monteiro",
  "Sofia Andrade",
];

const rand = <T>(arr: T[], i: number) => arr[i % arr.length];
const pad = (n: number) => String(n).padStart(4, "0");

export const clients: Client[] = [];

export const policies: Policy[] = [];

export const tasks: Task[] = [];

export const quotes: Quote[] = insurers.map((ins, i) => ({
  insurer: ins,
  price: 1850 + i * 240 - (i === 2 ? 320 : 0),
  deductible: 1500 + i * 200,
  coverages: [
    "Casco",
    "Terceiros 100k",
    "APP",
    "Carro reserva",
    i % 2 === 0 ? "Vidros" : "Assistência 24h",
  ],
  rating: 4 + ((i * 17) % 10) / 10,
}));

// Comissões seed — refletem os 3 modelos de comissionamento das apólices curadas
export const commissions: Commission[] = [];

export const team: TeamMember[] = [
  { id: "u1", name: "Ana Souza", role: "Sócia / Corretora", email: "ana@insuranceos.com" },
  { id: "u2", name: "Carlos Lima", role: "Corretor Sênior", email: "carlos@insuranceos.com" },
  { id: "u3", name: "Mariana Alves", role: "Atendimento", email: "mariana@insuranceos.com" },
  { id: "u4", name: "João Pereira", role: "Financeiro", email: "joao@insuranceos.com" },
];

export const followUps: FollowUp[] = [];


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
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** BRL sem centavos — usado em inputs que trabalham com reais inteiros. */
export const formatBRLInt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/**
 * @deprecated Importe de `@/lib/format` em vez de `@/lib/mock/data`.
 * Re-export mantido para compatibilidade durante a migração incremental.
 */
export { formatDateShort } from "@/lib/format";
