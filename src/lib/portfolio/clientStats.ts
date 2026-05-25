import { clients, policies, tasks, commissions, type Client, type Branch, type PolicyStatus } from "@/lib/mock/data";

export type ClientStatus = "ativo" | "inativo" | "lead";

export type ClientStats = {
  client: Client;
  activePolicies: number;
  totalPolicies: number;
  annualPremium: number;
  ltv: number;
  lastActivity: string; // ISO yyyy-mm-dd
  status: ClientStatus;
  branches: Branch[];
  openOpportunities: number;
};

const isActiveStatus = (s: PolicyStatus) => s === "ativa" || s === "pendente";

export function getClientStats(clientName: string): ClientStats | null {
  const client = clients.find((c) => c.name === clientName);
  if (!client) return null;
  return computeStats(client);
}

export function listClientsWithStats(): ClientStats[] {
  return clients.map(computeStats);
}

function computeStats(client: Client): ClientStats {
  const myPolicies = policies.filter((p) => p.clientName === client.name);
  const activePolicies = myPolicies.filter((p) => isActiveStatus(p.status));
  const annualPremium = activePolicies.reduce((sum, p) => sum + p.premium, 0);
  const ltv = myPolicies.reduce((sum, p) => sum + p.premium, 0);
  const myTasks = tasks.filter((t) => t.clientName === client.name);
  const openOpportunities = myTasks.filter((t) => t.stage !== "fechado" && t.stage !== "perdido").length;
  const myCommissions = commissions.filter((cm) => cm.clientName === client.name);
  const branches = Array.from(new Set(myPolicies.map((p) => p.branch))) as Branch[];

  const dates: string[] = [
    ...myPolicies.map((p) => p.startDate),
    ...myTasks.map((t) => t.dueDate),
    ...myCommissions.map((c) => c.dueDate),
  ].sort();
  const lastActivity = dates.length ? dates[dates.length - 1] : "";

  let status: ClientStatus = "inativo";
  if (activePolicies.length > 0) status = "ativo";
  else if (myPolicies.length === 0 && openOpportunities > 0) status = "lead";

  return {
    client,
    activePolicies: activePolicies.length,
    totalPolicies: myPolicies.length,
    annualPremium,
    ltv,
    lastActivity,
    status,
    branches,
    openOpportunities,
  };
}

export const initialsOf = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
