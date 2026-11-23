"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface Run {
  id: string;
  request: string;
  status: string;
  step: string;
  cyclesUsed: number;
  maxCycles: number;
  finalReport: string | null;
  errorMessage: string | null;
  providerSnapshot: string | null;
  createdAt: string;
  finishedAt: string | null;
}

interface Task {
  id: string;
  seq: number;
  description: string;
  status: string;
  attempts: number;
  lastFailureReason: string | null;
  resultSummary: string | null;
}

interface Activity {
  id: number;
  taskId: string | null;
  agent: string;
  kind: string;
  content: string;
  durationMs: number | null;
  createdAt: string;
}

interface Payload {
  run: Run;
  tasks: Task[];
  activities: Activity[];
}

const TERMINAL = new Set([
  "completed",
  "completed_with_failures",
  "error",
  "rejected",
]);

const RUN_STATUS_LABEL: Record<string, string> = {
  pending: "En cola",
  running: "En curso",
  completed: "Completada",
  completed_with_failures: "Completada con fallos",
  error: "Error",
  rejected: "Rechazada",
};

const TASK_STATUS_LABEL: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pendiente", classes: "bg-stone-200 text-stone-600" },
  in_progress: { label: "En curso", classes: "bg-blue-100 text-blue-800" },
  in_review: { label: "En revisión", classes: "bg-violet-100 text-violet-800" },
  failed: { label: "Fallada", classes: "bg-red-100 text-red-800" },
  completed: { label: "Completada", classes: "bg-emerald-100 text-emerald-800" },
};

const AGENT_LABEL: Record<string, string> = {
  orchestrator: "Orquestador",
  develop: "Develop",
  testing: "Testing",
  system: "Sistema",
};

const AGENT_DOT: Record<string, string> = {
  orchestrator: "bg-amber-500",
  develop: "bg-blue-500",
  testing: "bg-violet-500",
  system: "bg-stone-400",
};

export function RunView({ runId }: { runId: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [paused, setPaused] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const stopped = useRef(false);

  const active = payload !== null && !TERMINAL.has(payload.run.status);

  const load = useCallback(async () => {
    const res = await fetch(`/api/runs/${runId}`);
    if (res.status === 404) {
      setNotFound(true);
      return null;
    }
    const data = (await res.json()) as Payload;
    setPayload(data);
    return data;
  }, [runId]);

  useEffect(() => {
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function drive() {
      const current = await load();
      if (!current || stopped.current) return;
      if (TERMINAL.has(current.run.status)) return;

      try {
        const res = await fetch(`/api/runs/${runId}/advance`, { method: "POST" });
        const data = await res.json();
        if (res.status === 503) {
          setPaused(data.error ?? "Sin servicio de IA disponible.");
          return;
        }
        if (res.ok) {
          setPayload(data as Payload);
          setPaused(null);
          if (!TERMINAL.has((data as Payload).run.status)) {
            timer = setTimeout(drive, 400);
          }
          return;
        }
        setPaused(data.error ?? "Error avanzando la ejecución.");
      } catch {
        setPaused("Error de conexión con el servidor.");
      }
    }

    drive();
    return () => {
      stopped.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [load, runId]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-red-300 bg-red-50 p-6 text-red-800">
        Ejecución no encontrada. <Link href="/historial" className="underline">Ir al historial</Link>
      </div>
    );
  }

  if (!payload) {
    return <p className="text-stone-500">Cargando ejecución…</p>;
  }

  const { run, tasks, activities } = payload;
  const activeTask = tasks.find(
    (task) => task.status === "in_progress" || task.status === "in_review",
  );
  const activeAgent =
    run.status === "running" || run.status === "pending"
      ? run.step === "orchestrate"
        ? "orchestrator"
        : run.step === "test"
          ? "testing"
          : run.step === "develop"
            ? "develop"
            : null
      : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section>
        <div className="mb-4 rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-bold">«{run.request}»</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {new Date(run.createdAt).toLocaleString("es")}
            {run.providerSnapshot && ` · ${run.providerSnapshot}`}
            {run.maxCycles > 0 && ` · Ciclos de corrección: ${run.cyclesUsed}/${run.maxCycles}`}
          </p>
          {activeAgent && (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-stone-700">
              <span className={`inline-block h-2.5 w-2.5 animate-pulse rounded-full ${AGENT_DOT[activeAgent]}`} />
              {AGENT_LABEL[activeAgent]} trabajando
              {activeTask ? ` en la tarea ${activeTask.seq}` : "…"}
            </p>
          )}
          {paused && !TERMINAL.has(run.status) && (
            <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p>{paused}</p>
              <p className="mt-1">La ejecución está en pausa; se reanuda sola al recargar esta página o cuando el servicio de IA vuelva.</p>
            </div>
          )}
          {run.errorMessage && (
            <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              {run.errorMessage}
            </p>
          )}
        </div>

        <ol className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    <span className="mr-2 text-stone-400">{task.seq}.</span>
                    {task.description}
                  </p>
                  {task.resultSummary && (
                    <p className="mt-1 text-sm text-stone-600">{task.resultSummary}</p>
                  )}
                  {task.status === "failed" && task.lastFailureReason && (
                    <p className="mt-1 text-sm text-red-700">
                      Fallo: {task.lastFailureReason}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${TASK_STATUS_LABEL[task.status]?.classes ?? "bg-stone-200"}`}
                >
                  {TASK_STATUS_LABEL[task.status]?.label ?? task.status}
                  {task.attempts > 1 && ` · intento ${task.attempts}`}
                </span>
              </div>
            </li>
          ))}
          {tasks.length === 0 && (
            <li className="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500">
              El Orquestador aún no ha creado las tareas…
            </li>
          )}
        </ol>

        {run.finalReport && (
          <div className="mt-6 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
            <h2 className="mb-2 font-bold text-emerald-900">Informe final</h2>
            <pre className="whitespace-pre-wrap font-sans text-sm text-emerald-900">
              {run.finalReport}
            </pre>
            <Link href="/preview" className="mt-2 inline-block text-sm font-medium text-emerald-800 underline">
              Ver la web de ejemplo
            </Link>
          </div>
        )}
      </section>

      <aside>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">
          Actividad de los agentes
        </h2>
        <ol className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="rounded border border-stone-200 bg-white p-2.5 text-sm shadow-sm"
            >
              <p className="mb-0.5 flex items-center gap-2 text-xs font-semibold text-stone-600">
                <span className={`inline-block h-2 w-2 rounded-full ${AGENT_DOT[activity.agent] ?? "bg-stone-400"}`} />
                {AGENT_LABEL[activity.agent] ?? activity.agent}
                {activity.durationMs != null && (
                  <span className="font-normal text-stone-400">
                    · {(activity.durationMs / 1000).toFixed(1)} s
                  </span>
                )}
              </p>
              <p className="whitespace-pre-wrap text-stone-700">{activity.content}</p>
            </li>
          ))}
          {activities.length === 0 && (
            <li className="text-sm text-stone-400">Sin actividad todavía.</li>
          )}
        </ol>
        {active && (
          <p className="mt-2 text-xs text-stone-400">
            Actualizando en vivo…
          </p>
        )}
      </aside>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "completed"
      ? "bg-emerald-100 text-emerald-800"
      : status === "completed_with_failures"
        ? "bg-amber-100 text-amber-800"
        : status === "error" || status === "rejected"
          ? "bg-red-100 text-red-800"
          : "bg-blue-100 text-blue-800";
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${classes}`}>
      {RUN_STATUS_LABEL[status] ?? status}
    </span>
  );
}
