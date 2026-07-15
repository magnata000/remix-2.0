import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Cake,
  AtSign,
  CalendarClock,
  ListChecks,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useTaskStore, type TaskItem, PRIORITY_META } from "@/lib/tasks/taskStore";
import { useClientStore } from "@/lib/portfolio/clientStore";
import { usePolicyStore } from "@/lib/portfolio/policyStore";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useTeam, useTeamNameIndex } from "@/lib/team/teamStore";
import { type Policy, type Beneficiary } from "@/lib/mock/data";
import { formatDateShort } from "@/lib/format";
import { ageAt, findBandChange, isBirthdayToday } from "@/lib/daily/ageBands";
import {
  daysBetween,
  relativeDueLabel,
  toneClass,
  type RelativeDue,
} from "@/lib/daily/dateUtils";
import { textMentionsUser, type TeamNameIndex } from "@/lib/daily/mentions";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { useNavigation } from "@/lib/navigation";

// ---------- section: Tasks ----------

type TaskEntry = { task: TaskItem; relative: RelativeDue };

function useMyTasks(now: Date): TaskEntry[] {
  const { tasks, columns } = useTaskStore();
  const currentUserId = useCurrentUserId();
  return useMemo(() => {
    const concluidoIds = new Set(
      columns.filter((c) => /conclu|finaliz|done/i.test(c.title)).map((c) => c.id),
    );
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 3);
    return tasks
      .filter((t) => t.assigneeId === currentUserId && !concluidoIds.has(t.columnId))
      .filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        if (Number.isNaN(d.getTime())) return false; // datas ruins não entram na Daily
        return d <= horizon; // inclui atrasadas
      })
      .map((task) => ({ task, relative: relativeDueLabel(task.dueDate, now) }))
      .sort((a, b) => {
        const da = new Date(a.task.dueDate!).getTime();
        const db = new Date(b.task.dueDate!).getTime();
        if (da !== db) return da - db;
        const rank = { alta: 0, media: 1, baixa: 2 } as const;
        return rank[a.task.priority] - rank[b.task.priority];
      });
  }, [tasks, columns, currentUserId, now]);
}

function TasksSection({ now, onOpenTask }: { now: Date; onOpenTask: (t: TaskItem) => void }) {
  const entries = useMyTasks(now);
  return (
    <SectionCard
      icon={<ListChecks className="h-4 w-4" />}
      title="Minhas tarefas"
      subtitle="Próximos 3 dias + atrasadas"
      count={entries.length}
    >
      {entries.length === 0 ? (
        <EmptyState text="Sem tarefas urgentes. Aproveite! 🎉" />
      ) : (
        <ul className="divide-y divide-border">
          {entries.map(({ task, relative }) => {
            const pr = PRIORITY_META[task.priority];
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onOpenTask(task)}
                  className="w-full text-left py-2.5 px-1 hover:bg-muted/40 rounded-lg transition flex items-start gap-3"
                >
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${toneClass[relative.tone]}`}
                  >
                    {relative.text}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.clientName && (
                      <p className="text-xs text-muted-foreground truncate">{task.clientName}</p>
                    )}
                  </div>
                  <Badge className={`${pr.className} border-0 shrink-0`}>{pr.label}</Badge>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

// ---------- section: Mentions ----------

type MentionEntry = {
  taskId: string;
  taskTitle: string;
  authorId: string;
  at: string;
  preview: string;
  clientName?: string;
};

function useMyMentions(teamIndex: TeamNameIndex): MentionEntry[] {
  const { tasks } = useTaskStore();
  const currentUserId = useCurrentUserId();

  return useMemo(() => {
    // Cache local — `extractMentions` faz backtracking O(n) por match;
    // muitos comentários repetem @menções, então cachear por texto ajuda.
    const mentionCache = new Map<string, string[]>();
    const hit = (text: string) =>
      textMentionsUser(text, currentUserId, teamIndex, mentionCache);

    const out: MentionEntry[] = [];
    tasks.forEach((task) => {
      // Descrição da task (autor = assigneeId como proxy — ainda não temos createdBy)
      if (task.description && hit(task.description)) {
        out.push({
          taskId: task.id,
          taskTitle: task.title,
          authorId: task.assigneeId,
          at: task.createdAt,
          preview: task.description,
          clientName: task.clientName,
        });
      }
      task.comments.forEach((c) => {
        if (c.authorId === currentUserId) return; // não me menciono
        if (c.text && hit(c.text)) {
          out.push({
            taskId: task.id,
            taskTitle: task.title,
            authorId: c.authorId,
            at: c.createdAt,
            preview: c.text,
            clientName: task.clientName,
          });
        }
      });
    });

    // Dedup por taskId+at, mais recente primeiro
    const seen = new Set<string>();
    return out
      .filter((e) => {
        const k = `${e.taskId}::${e.at}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [tasks, currentUserId, teamIndex]);
}

function MentionsSection({
  teamIndex,
  onOpenTaskId,
}: {
  teamIndex: TeamNameIndex;
  onOpenTaskId: (id: string) => void;
}) {
  const { members } = useTeam();
  const entries = useMyMentions(teamIndex);
  return (
    <SectionCard
      icon={<AtSign className="h-4 w-4" />}
      title="Menções para mim"
      subtitle="Onde alguém te marcou"
      count={entries.length}
    >
      {entries.length === 0 ? (
        <EmptyState text="Ninguém te marcou por aqui." />
      ) : (
        <ul className="divide-y divide-border">
          {entries.slice(0, 8).map((e, i) => {
            const author = members.find((t) => t.id === e.authorId);
            return (
              <li key={`${e.taskId}-${i}`}>
                <button
                  type="button"
                  onClick={() => onOpenTaskId(e.taskId)}
                  className="w-full text-left py-2.5 px-1 hover:bg-muted/40 rounded-lg transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{author?.name ?? "Alguém"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      · {formatDateShort(e.at)}
                    </span>
                  </div>
                  <p className="text-sm truncate mt-0.5">{e.taskTitle}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {e.preview}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

// ---------- section: Birthdays ----------

type BirthdayEntry = {
  key: string;
  name: string;
  kind: "Cliente" | "Beneficiário";
  contextLabel?: string; // titular da apólice
  age: number;
};

function useTodayBirthdays(now: Date): BirthdayEntry[] {
  const { clients } = useClientStore();
  const { policies } = usePolicyStore();
  return useMemo(() => {
    const out: BirthdayEntry[] = [];
    clients.forEach((c) => {
      if (c.birthDate && isBirthdayToday(c.birthDate, now)) {
        out.push({
          key: `client:${c.id}`,
          name: c.name,
          kind: "Cliente",
          age: ageAt(c.birthDate, now),
        });
      }
    });
    policies.forEach((p) => {
      if (p.branch !== "Saúde" || !p.beneficiaries) return;
      p.beneficiaries.forEach((b) => {
        if (isBirthdayToday(b.birthDate, now)) {
          out.push({
            key: `bnf:${p.id}:${b.id}`,
            name: b.name,
            kind: "Beneficiário",
            contextLabel: `Apólice ${p.number} · ${p.clientName}`,
            age: ageAt(b.birthDate, now),
          });
        }
      });
    });
    return out;
  }, [clients, policies, now]);
}

function BirthdaysSection({ now }: { now: Date }) {
  const entries = useTodayBirthdays(now);
  return (
    <SectionCard
      icon={<Cake className="h-4 w-4" />}
      title="Aniversariantes do dia"
      subtitle="Clientes e beneficiários"
      count={entries.length}
    >
      {entries.length === 0 ? (
        <EmptyState text="Nenhum aniversariante hoje." />
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((e) => (
            <li key={e.key} className="py-2.5 px-1 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                <Cake className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {e.name}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    · {e.age} anos
                  </span>
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {e.kind}
                  {e.contextLabel ? ` · ${e.contextLabel}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// ---------- section: Renewals ----------

type RenewalEntry = { policy: Policy; daysLeft: number };

function useUpcomingRenewals(now: Date): RenewalEntry[] {
  const { policies } = usePolicyStore();
  return useMemo(() => {
    const out: RenewalEntry[] = [];
    policies.forEach((p) => {
      if (p.status !== "ativa") return;
      const end = new Date(p.endDate);
      if (Number.isNaN(end.getTime())) return;
      const days = daysBetween(now, end);
      if (days >= 0 && days <= 30) out.push({ policy: p, daysLeft: days });
    });
    return out.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [policies, now]);
}

function RenewalsSection({ now, onGoToPortfolio }: { now: Date; onGoToPortfolio: () => void }) {
  const entries = useUpcomingRenewals(now);
  const currentUserId = useCurrentUserId();
  return (
    <SectionCard
      icon={<CalendarClock className="h-4 w-4" />}
      title="Apólices vencendo em 30 dias"
      subtitle="Priorize renovações"
      count={entries.length}
      action={
        entries.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onGoToPortfolio}
            className="text-xs h-7"
          >
            Ver carteira <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        ) : null
      }
    >
      {entries.length === 0 ? (
        <EmptyState text="Nada vencendo nos próximos 30 dias." />
      ) : (
        <ul className="divide-y divide-border">
          {entries.slice(0, 8).map(({ policy, daysLeft }) => {
            const tone =
              daysLeft <= 7 ? "danger" : daysLeft <= 15 ? "warning" : "info";
            const mine = policy.assigneeId === currentUserId;
            return (
              <li key={policy.id} className="py-2.5 px-1 flex items-start gap-3">
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${toneClass[tone]}`}
                >
                  {daysLeft === 0 ? "Hoje" : `${daysLeft}d`}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {policy.clientName}
                    {mine && (
                      <span className="ml-2 text-[10px] font-medium text-brand">SUA</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {policy.number} · {policy.branch} · {policy.insurer}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDateShort(policy.endDate)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

// ---------- section: Age Band ----------

type AgeBandEntry = {
  key: string;
  name: string;
  currentBand: string;
  nextBand: string;
  changeDate: Date;
  contextLabel: string;
  kind: "Cliente" | "Beneficiário";
};

function useAgeBandChanges(now: Date): AgeBandEntry[] {
  const { policies } = usePolicyStore();
  const { clients } = useClientStore();
  return useMemo(() => {
    const out: AgeBandEntry[] = [];
    const healthPolicies = policies.filter((p) => p.branch === "Saúde");
    // Clientes titulares de saúde: casar por nome
    const clientByName = new Map(clients.map((c) => [c.name, c] as const));

    healthPolicies.forEach((p) => {
      const holder = clientByName.get(p.clientName);
      if (holder?.birthDate) {
        const change = findBandChange(holder.birthDate, 90, now);
        if (change) {
          out.push({
            key: `holder:${p.id}:${holder.id}`,
            name: holder.name,
            currentBand: change.currentBand,
            nextBand: change.nextBand,
            changeDate: change.changeDate,
            contextLabel: `Titular · Apólice ${p.number}`,
            kind: "Cliente",
          });
        }
      }
      (p.beneficiaries ?? []).forEach((b: Beneficiary) => {
        const change = findBandChange(b.birthDate, 90, now);
        if (change) {
          out.push({
            key: `bnf:${p.id}:${b.id}`,
            name: b.name,
            currentBand: change.currentBand,
            nextBand: change.nextBand,
            changeDate: change.changeDate,
            contextLabel: `Beneficiário · Apólice ${p.number} · ${p.clientName}`,
            kind: "Beneficiário",
          });
        }
      });
    });

    return out.sort((a, b) => a.changeDate.getTime() - b.changeDate.getTime());
  }, [policies, clients, now]);
}

function AgeBandSection({ now }: { now: Date }) {
  const entries = useAgeBandChanges(now);
  return (
    <SectionCard
      icon={<TrendingUp className="h-4 w-4" />}
      title="Troca de faixa etária (Saúde)"
      subtitle="Próximos 3 meses · faixas ANS"
      count={entries.length}
    >
      {entries.length === 0 ? (
        <EmptyState text="Ninguém muda de faixa nos próximos 3 meses." />
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-2 py-2 font-medium">Nome</th>
                <th className="px-2 py-2 font-medium hidden md:table-cell">Vínculo</th>
                <th className="px-2 py-2 font-medium">Faixa</th>
                <th className="px-2 py-2 font-medium text-right">Data</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.key} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-2 py-2 font-medium">
                    {e.name}
                    <p className="text-xs text-muted-foreground md:hidden">{e.contextLabel}</p>
                  </td>
                  <td className="px-2 py-2 hidden md:table-cell text-xs text-muted-foreground">
                    {e.contextLabel}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    <span className="text-muted-foreground">{e.currentBand}</span>
                    <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                    <span className="font-semibold text-warning">{e.nextBand}</span>
                  </td>
                  <td className="px-2 py-2 text-right text-xs">
                    {e.changeDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

// ---------- shared ----------

function SectionCard({
  icon,
  title,
  subtitle,
  count,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 rounded-2xl border-border shadow-none">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{title}</h2>
              <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0">
                {count}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="max-h-80 overflow-y-auto pr-1">{children}</div>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-8 text-center text-xs text-muted-foreground">{text}</div>
  );
}

// ---------- module ----------

export function DailyModule() {
  // `now` inicia como null: SSR e primeiro paint do cliente renderizam o mesmo
  // HTML (sem saudação/data), eliminando o hydration mismatch. O useEffect
  // popula o horário real logo após montar.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  const currentUserId = useCurrentUserId();
  const meName = team.find((t) => t.id === currentUserId)?.name ?? "";
  const firstName = meName.split(" ")[0] || "por aí";
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const { tasks } = useTaskStore();
  const nav = useNavigation();

  const openTaskById = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (t) setSelectedTask(t);
  };

  const greeting = (() => {
    if (!now) return "Olá";
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const dateLabel = now
    ? now.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      })
    : "";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 shrink-0 text-brand" />
            Daily
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {greeting}, {firstName}. Aqui está o que precisa da sua atenção hoje.
          </p>
        </div>
        {dateLabel && (
          <Badge variant="outline" className="rounded-full bg-card capitalize shrink-0">
            {dateLabel}
          </Badge>
        )}
      </div>

      {/* Grid — seções só renderizam depois que `now` foi definido no cliente */}
      {now && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TasksSection now={now} onOpenTask={setSelectedTask} />
            <MentionsSection onOpenTaskId={openTaskById} />
            <BirthdaysSection now={now} />
            <RenewalsSection now={now} onGoToPortfolio={() => nav.goTo("policies")} />
          </div>
          <AgeBandSection now={now} />
        </>
      )}

      <TaskDetailDialog
        task={selectedTask}
        onOpenChange={(o) => !o && setSelectedTask(null)}
      />
    </div>
  );
}
