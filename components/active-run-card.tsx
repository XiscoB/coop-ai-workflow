"use client";

import Link from "next/link";
import { useRunDriver } from "@/components/use-run-driver";
import { AgentChip, RunStatusBadge } from "@/components/run-badges";

export function ActiveRunCard({ runId }: { runId: string }) {
  const { payload, paused } = useRunDriver(runId);

  if (!payload) {
    return (
      <section className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Conectando con la ejecución…
        </p>
      </section>
    );
  }

  const { run, tasks } = payload;
  const done = tasks.filter((task) => task.status === "completed").length;
  const currentTask = tasks.find(
    (task) => task.status === "in_progress" || task.status === "in_review",
  );
  const activeAgent =
    run.step === "orchestrate"
      ? "orchestrator"
      : run.step === "test"
        ? "testing"
        : run.step === "develop"
          ? "develop"
          : null;
  const progress = tasks.length > 0 ? (done / tasks.length) * 100 : 0;

  return (
    <section className="rounded-lg border border-blue-300 bg-white p-4 shadow-sm dark:border-blue-900 dark:bg-stone-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold dark:text-stone-100">
          Ejecución en curso: «{run.request}»
        </h2>
        <RunStatusBadge status={run.status} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
        {activeAgent && <AgentChip agent={activeAgent} pulse />}
        <span>
          Tareas: {done}/{tasks.length}
        </span>
        <span>
          Ciclos: {run.cyclesUsed}/{run.maxCycles}
        </span>
        {currentTask && (
          <span className="truncate">
            Ahora: {currentTask.description}
          </span>
        )}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {paused && (
        <p className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          {paused} (en pausa; se reanuda al recargar)
        </p>
      )}

      <Link
        href={`/ejecucion/${run.id}`}
        className="mt-3 inline-block text-sm font-medium text-blue-700 underline dark:text-blue-300"
      >
        Ver en directo con toda la actividad →
      </Link>
    </section>
  );
}
