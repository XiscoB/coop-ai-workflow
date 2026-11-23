import type { Run } from "@/lib/db/schema";
import type { Store } from "@/lib/store";

export class RecoveryError extends Error {
  constructor(
    public readonly code: "RUN_NOT_FOUND" | "NOT_RESUMABLE" | "RUN_IN_PROGRESS" | "NO_SNAPSHOT",
    message: string,
  ) {
    super(message);
    this.name = "RecoveryError";
  }
}

/**
 * Reanuda una ejecución terminada en `error` o `completed_with_failures`
 * (spec 003, FR-002): el motor es una máquina de estados persistida, así que
 * basta con devolverla a `running` desde su paso guardado. Las tareas
 * `failed` se reactivan a `pending` conservando el motivo como feedback para
 * Develop, y el presupuesto de ciclos se renueva (cycles_used = 0): reanudar
 * con el contador gastado condenaba la ejecución a morir en el primer fallo.
 * Las tareas completadas NO se repiten.
 */
export async function resumeRun(store: Store, runId: string): Promise<Run> {
  const run = await store.getRun(runId);
  if (!run) throw new RecoveryError("RUN_NOT_FOUND", "Ejecución no encontrada.");
  if (run.status !== "error" && run.status !== "completed_with_failures") {
    throw new RecoveryError(
      "NOT_RESUMABLE",
      "Solo se pueden reanudar ejecuciones terminadas en error o con fallos.",
    );
  }

  const tasks = await store.getTasks(runId);
  let firstReactivated: string | null = null;
  for (const task of tasks) {
    if (task.status === "failed") {
      await store.updateTask(task.id, { status: "pending" });
      if (!firstReactivated) firstReactivated = task.id;
    }
  }

  const hasPendingWork = tasks.some(
    (task) => task.status === "failed" || task.status === "pending",
  );

  await store.updateRun(run.id, {
    status: "running",
    step: hasPendingWork ? "develop" : "report",
    currentTaskId: firstReactivated,
    cyclesUsed: 0,
    errorMessage: null,
    finishedAt: null,
  });

  await store.addActivity({
    runId: run.id,
    agent: "system",
    kind: "status_change",
    content:
      run.status === "error"
        ? "Ejecución reanudada manualmente desde el punto de interrupción."
        : "Tareas falladas reactivadas con presupuesto de ciclos renovado.",
  });

  const updated = await store.getRun(runId);
  return updated ?? run;
}

/**
 * Restaura el sandbox a la foto tomada al arrancar la ejecución (FR-003).
 * Solo con la ejecución terminal y sin otra activa (misma guarda que el
 * restablecido a semilla).
 */
export async function revertRun(store: Store, runId: string): Promise<Run> {
  const run = await store.getRun(runId);
  if (!run) throw new RecoveryError("RUN_NOT_FOUND", "Ejecución no encontrada.");

  const snapshot = run.sandboxSnapshot as Record<string, string> | null;
  if (!snapshot || typeof snapshot !== "object") {
    throw new RecoveryError(
      "NO_SNAPSHOT",
      "Esta ejecución no tiene foto del sandbox (es anterior a la función de revertir).",
    );
  }

  const active = await store.findActiveRun();
  if (active) {
    throw new RecoveryError(
      "RUN_IN_PROGRESS",
      "No se puede revertir mientras hay una ejecución en curso.",
    );
  }

  await store.sandboxReset(
    Object.entries(snapshot).map(([path, content]) => ({ path, content })),
  );

  await store.addActivity({
    runId: run.id,
    agent: "system",
    kind: "status_change",
    content:
      "Cambios revertidos: la web ha vuelto al estado previo a esta ejecución.",
  });

  return run;
}
