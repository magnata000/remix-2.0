import type { TaskItem } from "./taskStore";
import { MESSAGE_PREVIEW_LIMIT } from "./taskStore";

export type TaskSearchMatch =
  | { kind: "comment"; id: string; snippet: string }
  | { kind: "attachment"; id: string; snippet: string };

export type TaskSearchResult = {
  task: TaskItem;
  matches: TaskSearchMatch[];
};

const truncate = (s: string, n = MESSAGE_PREVIEW_LIMIT) =>
  s.length > n ? s.slice(0, n).trimEnd() + "…" : s;

export function searchTasks(tasks: TaskItem[], rawTerm: string): TaskSearchResult[] {
  const term = rawTerm.trim().toLowerCase();
  if (!term) return [];
  const out: TaskSearchResult[] = [];
  for (const task of tasks) {
    const matches: TaskSearchMatch[] = [];
    for (const c of task.comments) {
      if (c.text.toLowerCase().includes(term)) {
        matches.push({ kind: "comment", id: c.id, snippet: truncate(c.text) });
      }
    }
    for (const a of task.attachments) {
      if (a.name.toLowerCase().includes(term)) {
        matches.push({ kind: "attachment", id: a.id, snippet: a.name });
      }
    }
    if (matches.length) out.push({ task, matches });
  }
  return out;
}
