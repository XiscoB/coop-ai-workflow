export const AGENT_LABEL: Record<string, string> = {
  orchestrator: "Orquestador",
  develop: "Develop",
  testing: "Testing",
  system: "Sistema",
};

export const AGENT_DOT: Record<string, string> = {
  orchestrator: "bg-amber-500",
  develop: "bg-blue-500",
  testing: "bg-violet-500",
  system: "bg-stone-400",
};

const RUN_STATUS: Record<string, { label: string; classes: string }> = {
  pending: { label: "En cola", classes: "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300" },
  running: { label: "En curso", classes: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  completed: { label: "Completada", classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  completed_with_failures: { label: "Con fallos", classes: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  error: { label: "Error", classes: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  rejected: { label: "Rechazada", classes: "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300" },
};

export const TASK_STATUS: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pendiente", classes: "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300" },
  in_progress: { label: "En curso", classes: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  in_review: { label: "En revisión", classes: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300" },
  failed: { label: "Fallada", classes: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  completed: { label: "Completada", classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
};

export function RunStatusBadge({ status }: { status: string }) {
  const info = RUN_STATUS[status] ?? { label: status, classes: "bg-stone-200 text-stone-600" };
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${info.classes}`}>
      {info.label}
    </span>
  );
}

export function TaskStatusBadge({ status, attempts }: { status: string; attempts?: number }) {
  const info = TASK_STATUS[status] ?? { label: status, classes: "bg-stone-200 text-stone-600" };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${info.classes}`}>
      {info.label}
      {attempts != null && attempts > 1 && ` · intento ${attempts}`}
    </span>
  );
}

export function AgentChip({ agent, pulse }: { agent: string; pulse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${AGENT_DOT[agent] ?? "bg-stone-400"} ${pulse ? "animate-pulse" : ""}`}
      />
      {AGENT_LABEL[agent] ?? agent}
      {pulse && " trabajando"}
    </span>
  );
}
