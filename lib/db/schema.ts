import {
  bigserial,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const runStatusEnum = pgEnum("run_status", [
  "pending",
  "running",
  "completed",
  "completed_with_failures",
  "error",
  "rejected",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "in_review",
  "failed",
  "completed",
]);

export const agentEnum = pgEnum("agent_name", [
  "orchestrator",
  "develop",
  "testing",
  "system",
]);

export const activityKindEnum = pgEnum("activity_kind", [
  "message",
  "tool_call",
  "file_change",
  "verdict",
  "status_change",
]);

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  request: text("request").notNull(),
  status: runStatusEnum("status").notNull().default("pending"),
  step: text("step").notNull().default("orchestrate"),
  currentTaskId: uuid("current_task_id"),
  cyclesUsed: integer("cycles_used").notNull().default(0),
  maxCycles: integer("max_cycles").notNull().default(5),
  finalReport: text("final_report"),
  errorMessage: text("error_message"),
  providerSnapshot: text("provider_snapshot"),
  sandboxSnapshot: jsonb("sandbox_snapshot"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  revertedAt: timestamp("reverted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  seq: integer("seq").notNull(),
  description: text("description").notNull(),
  acceptanceCheck: jsonb("acceptance_check").notNull(),
  status: taskStatusEnum("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastFailureReason: text("last_failure_reason"),
  resultSummary: text("result_summary"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const activities = pgTable(
  "activities",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id),
    agent: agentEnum("agent").notNull(),
    kind: activityKindEnum("kind").notNull(),
    content: text("content").notNull(),
    detail: jsonb("detail"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("activities_run_id_id_idx").on(table.runId, table.id)],
);

export const sandboxFiles = pgTable("sandbox_files", {
  path: text("path").primaryKey(),
  content: text("content").notNull(),
  updatedByRun: uuid("updated_by_run").references(() => runs.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Run = typeof runs.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type SandboxFile = typeof sandboxFiles.$inferSelect;
