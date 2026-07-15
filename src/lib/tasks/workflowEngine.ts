import type { Policy, Beneficiary } from "@/lib/mock/data";
import type { TaskItem } from "./taskStore";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ANS_AGE_BRACKETS = [19, 24, 29, 34, 39, 44, 49, 54, 59];

type NewTaskInput = Omit<TaskItem, "id" | "createdAt" | "comments" | "attachments" | "timeline">;

type WorkflowDeps = {
  policies: Policy[];
  existingTasks: TaskItem[];
  defaultColumnId: string;
  now?: Date;
};

const fmtBR = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const fmtShort = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Próxima ocorrência (this year or next) de um dia/mês a partir de `from`. */
function nextOccurrence(from: Date, month: number, day: number): Date {
  const y = from.getFullYear();
  const candidate = new Date(y, month, day);
  if (
    candidate.getTime() < new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  ) {
    return new Date(y + 1, month, day);
  }
  return candidate;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function parseISODate(s: string): Date | null {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Calcula cards de workflow a serem criados.
 * Dedupe via `sourceKey = "wf:<tipo>:<policyId>[:<beneficiaryId>]:<yyyy-mm-dd>"`.
 */
export function runWorkflows({
  policies,
  existingTasks,
  defaultColumnId,
  now = new Date(),
}: WorkflowDeps): NewTaskInput[] {
  const existingKeys = new Set(
    existingTasks.map((t) => t.sourceKey).filter((k): k is string => !!k),
  );
  const out: NewTaskInput[] = [];

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const policy of policies) {
    if (policy.status === "renovada") continue;

    // 1) Vigência — 10 dias antes do endDate, para qualquer ramo ≠ Saúde
    if (policy.branch !== "Saúde") {
      const end = parseISODate(policy.endDate);
      if (end) {
        const diff = daysBetween(today, end);
        if (diff >= 0 && diff <= 10) {
          const key = `wf:vigencia:${policy.id}:${isoDay(end)}`;
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            out.push({
              title: `Renovação ${policy.branch} — ${policy.clientName} (vence ${fmtShort(end)})`,
              description: `Apólice ${policy.number} vence em ${fmtBR(end)}. Confirmar coberturas e enviar proposta de renovação.`,
              dueDate: end.toISOString(),
              priority: "alta",
              assigneeId: "all",
              clientName: policy.clientName,
              columnId: defaultColumnId,
              sourceKey: key,
            });
          }
        }
      }
    }

    // 2) Reajuste Saúde — 30 dias antes do healthAnniversary (dia/mês)
    if (policy.branch === "Saúde" && policy.healthAnniversary) {
      const anniv = parseISODate(policy.healthAnniversary);
      if (anniv) {
        const target = nextOccurrence(today, anniv.getMonth(), anniv.getDate());
        const diff = daysBetween(today, target);
        if (diff >= 0 && diff <= 30) {
          const key = `wf:reajuste:${policy.id}:${isoDay(target)}`;
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            out.push({
              title: `Reajuste Saúde — ${policy.clientName} (${fmtShort(target)})`,
              description: `Aniversário da apólice ${policy.number} em ${fmtBR(target)}. Revisar reajuste anual e comunicar o cliente.`,
              dueDate: target.toISOString(),
              priority: "alta",
              assigneeId: "all",
              clientName: policy.clientName,
              columnId: defaultColumnId,
              sourceKey: key,
            });
          }
        }
      }
    }

    // 3) Faixa etária — para cada beneficiário Saúde com aniversário ANS em até 30 dias
    if (policy.branch === "Saúde" && policy.beneficiaries?.length) {
      const titular = policy.beneficiaries.find((b: Beneficiary) => b.title === "titular");
      for (const ben of policy.beneficiaries) {
        const birth = parseISODate(ben.birthDate);
        if (!birth) continue;
        const nextBday = nextOccurrence(today, birth.getMonth(), birth.getDate());
        const ageOnNextBday = nextBday.getFullYear() - birth.getFullYear();
        if (!ANS_AGE_BRACKETS.includes(ageOnNextBday)) continue;
        const diff = daysBetween(today, nextBday);
        if (diff < 0 || diff > 30) continue;
        const key = `wf:faixa:${policy.id}:${ben.id}:${isoDay(nextBday)}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        out.push({
          title: `Faixa etária — ${ben.name} faz ${ageOnNextBday} em ${fmtShort(nextBday)}`,
          description: `Beneficiário da apólice ${policy.number} (${titular?.name ?? policy.clientName}) completa ${ageOnNextBday} anos em ${fmtBR(nextBday)} — possível mudança de faixa etária.`,
          dueDate: nextBday.toISOString(),
          priority: "alta",
          assigneeId: "all",
          clientName: policy.clientName,
          columnId: defaultColumnId,
          sourceKey: key,
        });
      }
    }
  }

  return out;
}
