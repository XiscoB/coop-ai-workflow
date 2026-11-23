import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";
import { getDb } from "./client";
import { activities, runs, sandboxFiles, tasks } from "./schema";
import type { NewActivity, NewTask, SeedFile, Store } from "@/lib/store";

const ACTIVE_STATUSES = ["pending", "running"] as const;

export function createDrizzleStore(): Store {
  const db = getDb();

  return {
    async createRun(data) {
      const [run] = await db
        .insert(runs)
        .values({
          request: data.request,
          maxCycles: data.maxCycles,
          providerSnapshot: data.providerSnapshot,
        })
        .returning();
      return run;
    },

    async getRun(id) {
      const [run] = await db.select().from(runs).where(eq(runs.id, id));
      return run ?? null;
    },

    async updateRun(id, patch) {
      await db.update(runs).set(patch).where(eq(runs.id, id));
    },

    async findActiveRun() {
      const [run] = await db
        .select()
        .from(runs)
        .where(inArray(runs.status, [...ACTIVE_STATUSES]))
        .orderBy(desc(runs.createdAt))
        .limit(1);
      return run ?? null;
    },

    async listRuns(limit) {
      return db
        .select()
        .from(runs)
        .orderBy(desc(runs.createdAt), desc(runs.id))
        .limit(limit);
    },

    async insertTasks(runId, items: NewTask[]) {
      if (items.length === 0) return [];
      return db
        .insert(tasks)
        .values(
          items.map((item) => ({
            runId,
            seq: item.seq,
            description: item.description,
            acceptanceCheck: item.acceptanceCheck,
          })),
        )
        .returning();
    },

    async getTasks(runId) {
      return db
        .select()
        .from(tasks)
        .where(eq(tasks.runId, runId))
        .orderBy(asc(tasks.seq));
    },

    async getTask(id) {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
      return task ?? null;
    },

    async updateTask(id, patch) {
      await db.update(tasks).set(patch).where(eq(tasks.id, id));
    },

    async addActivity(activity: NewActivity) {
      await db.insert(activities).values({
        runId: activity.runId,
        taskId: activity.taskId ?? null,
        agent: activity.agent,
        kind: activity.kind,
        content: activity.content,
        detail: activity.detail ?? null,
        durationMs: activity.durationMs ?? null,
      });
    },

    async listActivities(runId, afterId) {
      const condition = afterId
        ? and(eq(activities.runId, runId), gt(activities.id, afterId))
        : eq(activities.runId, runId);
      return db
        .select()
        .from(activities)
        .where(condition)
        .orderBy(asc(activities.id));
    },

    async sandboxList() {
      const rows = await db
        .select({ path: sandboxFiles.path })
        .from(sandboxFiles)
        .orderBy(asc(sandboxFiles.path));
      return rows.map((row) => row.path);
    },

    async sandboxRead(path) {
      const [file] = await db
        .select()
        .from(sandboxFiles)
        .where(eq(sandboxFiles.path, path));
      return file?.content ?? null;
    },

    async sandboxWrite(path, content, runId) {
      await db
        .insert(sandboxFiles)
        .values({
          path,
          content,
          updatedByRun: runId,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: sandboxFiles.path,
          set: { content, updatedByRun: runId, updatedAt: new Date() },
        });
    },

    async sandboxSnapshot() {
      const rows = await db.select().from(sandboxFiles);
      return Object.fromEntries(rows.map((row) => [row.path, row.content]));
    },

    async sandboxReset(files: SeedFile[]) {
      await db.delete(sandboxFiles);
      if (files.length > 0) {
        await db.insert(sandboxFiles).values(
          files.map((file) => ({ path: file.path, content: file.content })),
        );
      }
    },

    async sandboxCount() {
      const rows = await db.select({ path: sandboxFiles.path }).from(sandboxFiles);
      return rows.length;
    },
  };
}

let cached: Store | null = null;

export function getStore(): Store {
  if (!cached) cached = createDrizzleStore();
  return cached;
}
