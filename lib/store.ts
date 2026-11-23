import type { Activity, Run, Task } from "@/lib/db/schema";

export interface NewTask {
  seq: number;
  description: string;
  acceptanceCheck: unknown;
}

export interface NewActivity {
  runId: string;
  taskId?: string | null;
  agent: "orchestrator" | "develop" | "testing" | "system";
  kind: "message" | "tool_call" | "file_change" | "verdict" | "status_change";
  content: string;
  detail?: unknown;
  durationMs?: number | null;
}

export interface SeedFile {
  path: string;
  content: string;
}

/**
 * Acceso a datos de la app. La implementación de producción es Drizzle/Neon
 * (lib/db/store.ts); los tests usan la implementación en memoria
 * (lib/testing/memory-store.ts), así el motor se prueba sin base de datos.
 */
export interface Store {
  createRun(data: {
    request: string;
    maxCycles: number;
    providerSnapshot: string;
  }): Promise<Run>;
  getRun(id: string): Promise<Run | null>;
  updateRun(
    id: string,
    patch: Partial<
      Pick<
        Run,
        | "status"
        | "step"
        | "currentTaskId"
        | "cyclesUsed"
        | "finalReport"
        | "errorMessage"
        | "finishedAt"
        | "sandboxSnapshot"
      >
    >,
  ): Promise<void>;
  findActiveRun(): Promise<Run | null>;
  listRuns(limit: number): Promise<Run[]>;

  /**
   * Cerrojo de avance (spec 003, FR-006): evita que dos clientes ejecuten
   * pasos de la misma ejecución en paralelo (p. ej. dos pestañas). Devuelve
   * false si otro cliente la tiene bloqueada dentro del TTL.
   */
  acquireRunLock(id: string, ttlSeconds: number): Promise<boolean>;
  releaseRunLock(id: string): Promise<void>;

  insertTasks(runId: string, items: NewTask[]): Promise<Task[]>;
  getTasks(runId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | null>;
  updateTask(
    id: string,
    patch: Partial<
      Pick<
        Task,
        | "status"
        | "attempts"
        | "lastFailureReason"
        | "resultSummary"
        | "completedAt"
      >
    >,
  ): Promise<void>;

  addActivity(activity: NewActivity): Promise<void>;
  listActivities(runId: string, afterId?: number): Promise<Activity[]>;

  sandboxList(): Promise<string[]>;
  sandboxRead(path: string): Promise<string | null>;
  sandboxWrite(path: string, content: string, runId: string | null): Promise<void>;
  sandboxSnapshot(): Promise<Record<string, string>>;
  sandboxReset(files: SeedFile[]): Promise<void>;
  sandboxCount(): Promise<number>;
}
