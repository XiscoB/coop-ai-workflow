import type { Activity, Run, Task } from "@/lib/db/schema";
import type { NewActivity, NewTask, SeedFile, Store } from "@/lib/store";

let idCounter = 0;

function nextUuid(): string {
  idCounter += 1;
  return `00000000-0000-4000-8000-${String(idCounter).padStart(12, "0")}`;
}

const ACTIVE_STATUSES = new Set(["pending", "running"]);

/**
 * Store en memoria para tests: mismo contrato que el Store de Drizzle,
 * sin base de datos. No usar en producción.
 */
export function createMemoryStore(seedFiles: SeedFile[] = []): Store {
  const runsTable = new Map<string, Run>();
  const tasksTable = new Map<string, Task>();
  const activitiesTable = new Map<number, Activity>();
  const sandbox = new Map<string, string>(
    seedFiles.map((file) => [file.path, file.content]),
  );
  const settingsMap = new Map<string, string>();
  let activitySeq = 0;

  return {
    async createRun(data) {
      const now = new Date();
      const run: Run = {
        id: nextUuid(),
        request: data.request,
        status: "pending",
        step: "orchestrate",
        currentTaskId: null,
        cyclesUsed: 0,
        maxCycles: data.maxCycles,
        finalReport: null,
        errorMessage: null,
        providerSnapshot: data.providerSnapshot,
        sandboxSnapshot: null,
        lockedAt: null,
        revertedAt: null,
        createdAt: now,
        finishedAt: null,
      };
      runsTable.set(run.id, run);
      return run;
    },

    async getRun(id) {
      return runsTable.get(id) ?? null;
    },

    async updateRun(id, patch) {
      const run = runsTable.get(id);
      if (run) Object.assign(run, patch);
    },

    async findActiveRun() {
      const active = [...runsTable.values()]
        .filter((run) => ACTIVE_STATUSES.has(run.status))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return active[0] ?? null;
    },

    async listRuns(limit) {
      return [...runsTable.values()]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },

    async acquireRunLock(id, ttlSeconds) {
      const run = runsTable.get(id);
      if (!run) return false;
      const threshold = Date.now() - ttlSeconds * 1000;
      if (run.lockedAt && run.lockedAt.getTime() > threshold) return false;
      run.lockedAt = new Date();
      return true;
    },

    async releaseRunLock(id) {
      const run = runsTable.get(id);
      if (run) run.lockedAt = null;
    },

    async insertTasks(runId, items: NewTask[]) {
      const created = items.map((item) => {
        const task: Task = {
          id: nextUuid(),
          runId,
          seq: item.seq,
          description: item.description,
          acceptanceCheck: item.acceptanceCheck,
          status: "pending",
          attempts: 0,
          lastFailureReason: null,
          resultSummary: null,
          createdAt: new Date(),
          completedAt: null,
        };
        tasksTable.set(task.id, task);
        return task;
      });
      return created;
    },

    async getTasks(runId) {
      return [...tasksTable.values()]
        .filter((task) => task.runId === runId)
        .sort((a, b) => a.seq - b.seq);
    },

    async getTask(id) {
      return tasksTable.get(id) ?? null;
    },

    async updateTask(id, patch) {
      const task = tasksTable.get(id);
      if (task) Object.assign(task, patch);
    },

    async addActivity(activity: NewActivity) {
      activitySeq += 1;
      const row: Activity = {
        id: activitySeq,
        runId: activity.runId,
        taskId: activity.taskId ?? null,
        agent: activity.agent,
        kind: activity.kind,
        content: activity.content,
        detail: activity.detail ?? null,
        durationMs: activity.durationMs ?? null,
        createdAt: new Date(),
      };
      activitiesTable.set(row.id, row);
    },

    async listActivities(runId, afterId) {
      return [...activitiesTable.values()]
        .filter(
          (row) =>
            row.runId === runId && (afterId === undefined || row.id > afterId),
        )
        .sort((a, b) => a.id - b.id);
    },

    async sandboxList() {
      return [...sandbox.keys()].sort();
    },

    async sandboxRead(path) {
      return sandbox.get(path) ?? null;
    },

    async sandboxWrite(path, content) {
      sandbox.set(path, content);
    },

    async sandboxSnapshot() {
      return Object.fromEntries(sandbox);
    },

    async sandboxReset(files: SeedFile[]) {
      sandbox.clear();
      for (const file of files) sandbox.set(file.path, file.content);
    },

    async sandboxCount() {
      return sandbox.size;
    },

    async getSettings() {
      return Object.fromEntries(settingsMap);
    },

    async setSetting(key, value) {
      settingsMap.set(key, value);
    },

    async deleteSetting(key) {
      settingsMap.delete(key);
    },

    async listSystemActivities(limit) {
      return [...activitiesTable.values()]
        .filter((row) => row.agent === "system")
        .sort((a, b) => b.id - a.id)
        .slice(0, limit);
    },
  };
}
