import type { LLMProvider } from "@/lib/llm";
import type { Store } from "@/lib/store";
import type { Run, Task } from "@/lib/db/schema";
import { orchestrate } from "@/lib/agents/orchestrator";
import { develop } from "@/lib/agents/develop";
import { review, type Verdict } from "@/lib/agents/testing";
import {
  runDeterministicChecks,
  type AcceptanceCheck,
} from "@/lib/sandbox/checks";
import { ensureSandboxSeeded } from "@/lib/sandbox/seed";

export type ResolveProvider = (
  role: "orchestrator" | "develop" | "testing",
) => Promise<LLMProvider | null>;

export interface EngineDeps {
  store: Store;
  resolveProvider: ResolveProvider;
}

export const TERMINAL_STATUSES = new Set([
  "completed",
  "completed_with_failures",
  "error",
  "rejected",
]);

export function isTerminal(run: Run): boolean {
  return TERMINAL_STATUSES.has(run.status);
}

export class NoProviderError extends Error {
  constructor() {
    super(
      "No hay servicio de IA disponible en este momento. Configura Ollama en local o LLM_API_* y reanuda la ejecución.",
    );
    this.name = "NoProviderError";
  }
}

async function requireProvider(
  deps: EngineDeps,
  role: "orchestrator" | "develop" | "testing",
): Promise<LLMProvider> {
  const provider = await deps.resolveProvider(role);
  if (!provider) throw new NoProviderError();
  return provider;
}

async function stepOrchestrate(deps: EngineDeps, run: Run): Promise<void> {
  const { store } = deps;
  await store.updateRun(run.id, { status: "running" });
  await ensureSandboxSeeded(store);
  await store.addActivity({
    runId: run.id,
    agent: "system",
    kind: "status_change",
    content: "Ejecución iniciada. El Orquestador analiza la petición.",
  });

  const provider = await requireProvider(deps, "orchestrator");
  const files = await store.sandboxList();

  const start = Date.now();
  const outcome = await orchestrate(provider, run.request, files);
  const duration = Date.now() - start;

  if (outcome.kind === "rejected") {
    await store.addActivity({
      runId: run.id,
      agent: "orchestrator",
      kind: "message",
      content: `Petición rechazada: ${outcome.reason}`,
      durationMs: duration,
    });
    await store.updateRun(run.id, {
      status: "rejected",
      step: "report",
      finalReport: outcome.reason,
      errorMessage: null,
      finishedAt: new Date(),
    });
    return;
  }

  await store.addActivity({
    runId: run.id,
    agent: "orchestrator",
    kind: "message",
    content: `He descompuesto la petición en ${outcome.tasks.length} tarea(s):`,
    detail: outcome.tasks.map((task) => task.description),
    durationMs: duration,
  });

  const created = await store.insertTasks(
    run.id,
    outcome.tasks.map((task, index) => ({
      seq: index + 1,
      description: task.description,
      acceptanceCheck: task.acceptance_check,
    })),
  );

  await store.updateRun(run.id, {
    step: "develop",
    currentTaskId: created[0]?.id ?? null,
  });
}

async function stepDevelop(deps: EngineDeps, run: Run): Promise<void> {
  const { store } = deps;
  if (!run.currentTaskId) {
    await store.updateRun(run.id, { step: "report" });
    return;
  }
  const task = await store.getTask(run.currentTaskId);
  if (!task) {
    await store.updateRun(run.id, { step: "report" });
    return;
  }

  await store.updateTask(task.id, { status: "in_progress" });
  await store.addActivity({
    runId: run.id,
    taskId: task.id,
    agent: "develop",
    kind: "status_change",
    content:
      task.attempts > 0
        ? `Retomo la tarea «${task.description}» para corregir: ${task.lastFailureReason ?? "fallo anterior"}.`
        : `Empiezo la tarea «${task.description}».`,
  });

  const provider = await requireProvider(deps, "develop");
  const snapshot = await store.sandboxSnapshot();

  const start = Date.now();
  const result = await develop(
    provider,
    task.description,
    snapshot,
    task.lastFailureReason,
  );
  const duration = Date.now() - start;

  for (const change of result.changes) {
    await store.sandboxWrite(change.path, change.content, run.id);
    await store.addActivity({
      runId: run.id,
      taskId: task.id,
      agent: "develop",
      kind: "file_change",
      content: `Fichero escrito: ${change.path}`,
      detail: { path: change.path, content: change.content },
    });
  }

  await store.addActivity({
    runId: run.id,
    taskId: task.id,
    agent: "develop",
    kind: "message",
    content: result.summary,
    durationMs: duration,
  });

  await store.updateTask(task.id, {
    status: "in_review",
    attempts: task.attempts + 1,
    resultSummary: result.summary,
  });
  await store.updateRun(run.id, { step: "test" });
}

function currentAcceptanceCheck(task: Task): AcceptanceCheck {
  const raw = task.acceptanceCheck as { type?: string } | null;
  if (raw && typeof raw.type === "string") {
    return task.acceptanceCheck as AcceptanceCheck;
  }
  return {
    type: "llm_review",
    criterion: "El cambio descrito en la tarea se ha aplicado correctamente.",
  };
}

async function stepTest(deps: EngineDeps, run: Run): Promise<void> {
  const { store } = deps;
  const task = run.currentTaskId ? await store.getTask(run.currentTaskId) : null;
  if (!task) {
    await store.updateRun(run.id, { step: "report" });
    return;
  }

  await store.addActivity({
    runId: run.id,
    taskId: task.id,
    agent: "testing",
    kind: "status_change",
    content: `Reviso la tarea «${task.description}».`,
  });

  const snapshot = await store.sandboxSnapshot();
  const check = currentAcceptanceCheck(task);
  const deterministic = runDeterministicChecks(check, snapshot);

  // Ficheros que Develop escribió en el último intento de esta tarea.
  const activities = await store.listActivities(run.id);
  const changedFiles: Record<string, string> = {};
  for (const activity of activities) {
    if (activity.kind !== "file_change" || activity.taskId !== task.id) continue;
    const detail = activity.detail as { path?: string; content?: string } | null;
    if (detail?.path && typeof detail.content === "string") {
      changedFiles[detail.path] = detail.content;
    }
  }

  const provider = await requireProvider(deps, "testing");
  const start = Date.now();
  const verdict: Verdict = await review(
    provider,
    task.description,
    deterministic.failures,
    deterministic.llmReviewCriteria,
    changedFiles,
    snapshot,
  );
  const duration = Date.now() - start;

  await store.addActivity({
    runId: run.id,
    taskId: task.id,
    agent: "testing",
    kind: "verdict",
    content: verdict.pass
      ? "La tarea pasa la revisión."
      : `La tarea NO pasa la revisión: ${verdict.reasons.join(" · ")}`,
    detail: verdict,
    durationMs: duration,
  });

  if (verdict.pass) {
    await store.updateTask(task.id, {
      status: "completed",
      lastFailureReason: null,
      completedAt: new Date(),
    });
    const allTasks = await store.getTasks(run.id);
    const next = allTasks.find((candidate) => candidate.status === "pending");
    await store.updateRun(run.id, {
      step: next ? "develop" : "report",
      currentTaskId: next?.id ?? null,
    });
    return;
  }

  const cyclesUsed = run.cyclesUsed + 1;
  await store.updateTask(task.id, {
    status: "failed",
    lastFailureReason: verdict.reasons.join(" · "),
  });

  if (cyclesUsed >= run.maxCycles) {
    await store.addActivity({
      runId: run.id,
      agent: "system",
      kind: "status_change",
      content: `Límite de ${run.maxCycles} ciclos alcanzado. Se cierra la ejecución con los fallos pendientes.`,
    });
    await store.updateRun(run.id, { step: "report", cyclesUsed });
    return;
  }

  await store.updateRun(run.id, { step: "develop", cyclesUsed });
}

async function stepReport(deps: EngineDeps, run: Run): Promise<void> {
  const { store } = deps;
  const allTasks = await store.getTasks(run.id);
  const completed = allTasks.filter((task) => task.status === "completed");
  const failed = allTasks.filter((task) => task.status !== "completed");

  const lines: string[] = [];
  lines.push(`Petición: «${run.request}»`);
  lines.push(
    `Tareas completadas: ${completed.length}/${allTasks.length}` +
      (run.cyclesUsed > 0
        ? ` · Ciclos de corrección usados: ${run.cyclesUsed}/${run.maxCycles}`
        : ""),
  );
  for (const task of completed) {
    lines.push(`✔ ${task.description}`);
  }
  for (const task of failed) {
    lines.push(
      `✘ ${task.description} — ${task.lastFailureReason ?? "sin completar"}`,
    );
  }
  lines.push(
    "El resultado puede verse en la «Web de ejemplo» (menú superior).",
  );

  const hasFailures = failed.length > 0;
  await store.updateRun(run.id, {
    status: hasFailures ? "completed_with_failures" : "completed",
    finalReport: lines.join("\n"),
    finishedAt: new Date(),
  });

  await store.addActivity({
    runId: run.id,
    agent: "system",
    kind: "status_change",
    content: hasFailures
      ? "Ejecución terminada con fallos pendientes."
      : "Ejecución completada. Todo el trabajo pasó la revisión de Testing.",
  });
}

/**
 * Ejecuta exactamente UN paso del motor (research D2). Errores de LLM o de
 * proveedor dejan la ejecución en `error` con el motivo visible; cualquier otro
 * error también, para no dejar estados inconsistentes.
 */
export async function advance(deps: EngineDeps, runId: string): Promise<Run> {
  const { store } = deps;
  const run = await store.getRun(runId);
  if (!run) throw new Error(`Ejecución no encontrada: ${runId}`);
  if (isTerminal(run)) return run;

  try {
    switch (run.step) {
      case "orchestrate":
        await stepOrchestrate(deps, run);
        break;
      case "develop":
        await stepDevelop(deps, run);
        break;
      case "test":
        await stepTest(deps, run);
        break;
      case "report":
        await stepReport(deps, run);
        break;
      default:
        await store.updateRun(run.id, { step: "report" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Ninguna tarea puede quedar en estado transitorio cuando la ejecución
    // termina en error (SC-006): se marca como fallada con el motivo.
    const runTasks = await store.getTasks(run.id);
    for (const task of runTasks) {
      if (task.status === "in_progress" || task.status === "in_review") {
        await store.updateTask(task.id, {
          status: "failed",
          lastFailureReason: `La ejecución se detuvo: ${message}`,
        });
      }
    }
    await store.addActivity({
      runId: run.id,
      agent: "system",
      kind: "status_change",
      content: `La ejecución se detuvo por un error: ${message}`,
    });
    await store.updateRun(run.id, {
      status: "error",
      errorMessage: message,
      finishedAt: new Date(),
    });
  }

  const updated = await store.getRun(runId);
  return updated ?? run;
}
