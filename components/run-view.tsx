"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRunDriver, TERMINAL_STATUSES } from "@/components/use-run-driver";
import {
  AGENT_DOT,
  AGENT_LABEL,
  AgentChip,
  RunStatusBadge,
  TaskStatusBadge,
} from "@/components/run-badges";
import { Spinner } from "@/components/spinner";
import { formatEventTime } from "@/components/format";

export function RunView({ runId }: { runId: string }) {
  const { payload, paused, busyWait, notFound, active, resume } =
    useRunDriver(runId);
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [pacing, setPacing] = useState<{
    paceSeconds: number;
    nextCallInSeconds: number;
  } | null>(null);

  // Estado del modo lento: sondea /api/llm/status mientras la ejecución está
  // activa para mostrar si estamos esperando por el límite del tier gratuito.
  useEffect(() => {
    if (!active) {
      setPacing(null);
      return;
    }
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/llm/status");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.pacing) setPacing(data.pacing);
      } catch {
        // sin estado de pacing disponible
      }
    }
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active]);

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
    return (
      <div className="flex items-center gap-3 text-stone-500 dark:text-stone-400">
        <Spinner /> Cargando ejecución…
      </div>
    );
  }

  const { run, tasks, activities } = payload;
  // Cronología inversa (lo más reciente arriba, estilo Twitter) — FR-007.
  const activitiesDesc = [...activities].reverse();

  async function onResume() {
    setRecovering(true);
    setRecoveryMsg(null);
    const error = await resume();
    if (error) setRecoveryMsg(error);
    setRecovering(false);
  }

  async function onRevert() {
    if (
      !confirm(
        "¿Revertir los cambios de esta ejecución? La web volverá al estado previo.",
      )
    )
      return;
    setRecovering(true);
    setRecoveryMsg(null);
    try {
      const res = await fetch(`/api/runs/${run.id}/revert`, { method: "POST" });
      const data = await res.json();
      setRecoveryMsg(
        res.ok
          ? "Cambios revertidos: la web volvió al estado previo a esta ejecución."
          : (data.error ?? "No se pudo revertir."),
      );
    } catch {
      setRecoveryMsg("Error de conexión al revertir.");
    } finally {
      setRecovering(false);
    }
  }

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
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section>
        <div className="mb-4 rounded-lg border border-stone-300 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900 lg:sticky lg:top-4 lg:z-10">
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
          {busyWait && !TERMINAL_STATUSES.has(run.status) && (
            <p className="mt-3 rounded border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
              Otra pestaña está conduciendo esta ejecución; sincronizando
              automáticamente…
            </p>
          )}
          {active && pacing && pacing.nextCallInSeconds > 0 && (
            <p className="mt-3 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
              El proveedor gratuito está al límite de peticiones: próxima
              llamada en ~{pacing.nextCallInSeconds} s (modo lento automático).
              La ejecución continúa sola.
            </p>
          )}
          {active && pacing && pacing.nextCallInSeconds === 0 && pacing.paceSeconds > 0 && (
            <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
              Modo lento activo: ~{pacing.paceSeconds} s entre llamadas al
              proveedor gratuito.
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
          {TERMINAL_STATUSES.has(run.status) && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {(run.status === "error" ||
                (run.status === "completed_with_failures" &&
                  tasks.some((task) => task.status === "failed"))) && (
                <button
                  onClick={onResume}
                  disabled={recovering}
                  className="inline-flex items-center gap-2 rounded bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
                >
                  {recovering && <Spinner small />}
                  {recovering
                    ? "Reanudando…"
                    : run.status === "error"
                      ? "Reintentar desde aquí"
                      : "Reintentar tareas falladas"}
                </button>
              )}
              {run.sandboxSnapshot && (
                <button
                  onClick={onRevert}
                  disabled={recovering}
                  className="inline-flex items-center gap-2 rounded border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                >
                  {recovering && <Spinner small />}
                  Revertir cambios
                </button>
              )}
              {recoveryMsg && (
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  {recoveryMsg}
                </span>
              )}
            </div>
          )}
        </div>

        {run.finalReport && (
          <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/50">
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
      </section>

      <aside>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Actividad de los agentes
        </h2>
        <ol className="relative ml-2 max-h-[70vh] space-y-3 overflow-y-auto border-l-2 border-stone-200 pl-4 pr-1 dark:border-stone-700">
          {activitiesDesc.map((activity) => (
            <li key={activity.id} className="relative">
              <span
                className={`absolute -left-[21px] top-3 inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-stone-900 ${AGENT_DOT[activity.agent] ?? "bg-stone-400"}`}
              />
              <div className="rounded border border-stone-200 bg-white p-2.5 text-sm shadow-sm dark:border-stone-700 dark:bg-stone-900">
                <p className="mb-0.5 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-stone-600 dark:text-stone-400">
                  {AGENT_LABEL[activity.agent] ?? activity.agent}
                  <time
                    className="font-normal text-stone-400 dark:text-stone-500"
                    dateTime={activity.createdAt}
                  >
                    {formatEventTime(activity.createdAt)}
                  </time>
                  {activity.durationMs != null && (
                    <span className="font-normal text-stone-400 dark:text-stone-500">
                      · {(activity.durationMs / 1000).toFixed(1)} s
                    </span>
                  )}
                </p>
                <p className="whitespace-pre-wrap text-stone-700 dark:text-stone-300">
                  {activity.content}
                </p>
              </div>
            </li>
          ))}
          {activitiesDesc.length === 0 && (
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
