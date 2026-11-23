"use client";

import Link from "next/link";
import { useRunDriver, TERMINAL_STATUSES } from "@/components/use-run-driver";
import {
  AGENT_DOT,
  AGENT_LABEL,
  AgentChip,
  RunStatusBadge,
  TaskStatusBadge,
} from "@/components/run-badges";

export function RunView({ runId }: { runId: string }) {
  const { payload, paused, notFound, active } = useRunDriver(runId);

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-red-300 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
        Ejecución no encontrada.{" "}
        <Link href="/historial" className="underline">
          Ir al historial
        </Link>
      </div>
    );
  }

  if (!payload) {
    return <p className="text-stone-500 dark:text-stone-400">Cargando ejecución…</p>;
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
        <div className="mb-4 rounded-lg border border-stone-300 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-bold dark:text-stone-100">«{run.request}»</h1>
            <RunStatusBadge status={run.status} />
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {new Date(run.createdAt).toLocaleString("es")}
            {run.providerSnapshot && ` · ${run.providerSnapshot}`}
            {run.maxCycles > 0 && ` · Ciclos de corrección: ${run.cyclesUsed}/${run.maxCycles}`}
          </p>
          {activeAgent && (
            <p className="mt-3">
              <AgentChip agent={activeAgent} pulse />
              {activeTask && (
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  {" "}
                  — tarea {activeTask.seq}
                </span>
              )}
            </p>
          )}
          {paused && !TERMINAL_STATUSES.has(run.status) && (
            <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              <p>{paused}</p>
              <p className="mt-1">
                La ejecución está en pausa; se reanuda sola al recargar esta
                página o cuando el servicio de IA vuelva.
              </p>
            </div>
          )}
          {run.errorMessage && (
            <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
              {run.errorMessage}
            </p>
          )}
        </div>

        <ol className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium dark:text-stone-100">
                    <span className="mr-2 text-stone-400 dark:text-stone-500">{task.seq}.</span>
                    {task.description}
                  </p>
                  {task.resultSummary && (
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                      {task.resultSummary}
                    </p>
                  )}
                  {task.status === "failed" && task.lastFailureReason && (
                    <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                      Fallo: {task.lastFailureReason}
                    </p>
                  )}
                </div>
                <TaskStatusBadge status={task.status} attempts={task.attempts} />
              </div>
            </li>
          ))}
          {tasks.length === 0 && (
            <li className="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
              El Orquestador aún no ha creado las tareas…
            </li>
          )}
        </ol>

        {run.finalReport && (
          <div className="mt-6 rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/50">
            <h2 className="mb-2 font-bold text-emerald-900 dark:text-emerald-200">
              Informe final
            </h2>
            <pre className="whitespace-pre-wrap font-sans text-sm text-emerald-900 dark:text-emerald-200">
              {run.finalReport}
            </pre>
            <Link
              href="/preview"
              className="mt-2 inline-block text-sm font-medium text-emerald-800 underline dark:text-emerald-300"
            >
              Ver la web de ejemplo
            </Link>
          </div>
        )}
      </section>

      <aside>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Actividad de los agentes
        </h2>
        <ol className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="rounded border border-stone-200 bg-white p-2.5 text-sm shadow-sm dark:border-stone-700 dark:bg-stone-900"
            >
              <p className="mb-0.5 flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-400">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${AGENT_DOT[activity.agent] ?? "bg-stone-400"}`}
                />
                {AGENT_LABEL[activity.agent] ?? activity.agent}
                {activity.durationMs != null && (
                  <span className="font-normal text-stone-400 dark:text-stone-500">
                    · {(activity.durationMs / 1000).toFixed(1)} s
                  </span>
                )}
              </p>
              <p className="whitespace-pre-wrap text-stone-700 dark:text-stone-300">
                {activity.content}
              </p>
            </li>
          ))}
          {activities.length === 0 && (
            <li className="text-sm text-stone-400 dark:text-stone-500">
              Sin actividad todavía.
            </li>
          )}
        </ol>
        {active && (
          <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
            Actualizando en vivo…
          </p>
        )}
      </aside>
    </div>
  );
}
