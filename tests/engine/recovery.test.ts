import { describe, expect, it } from "vitest";
import { advance, isTerminal } from "@/lib/engine/runner";
import { RecoveryError, resumeRun, revertRun } from "@/lib/engine/recovery";
import { createMemoryStore } from "@/lib/testing/memory-store";
import type { LLMProvider } from "@/lib/llm";
import type { Store } from "@/lib/store";

const SEED = [
  { path: "/index.html", content: "<html>inicio</html>" },
  { path: "/styles.css", content: "body {}" },
];

function fakeProvider(
  overrides: Partial<
    Record<string, (call: number) => Record<string, unknown>>
  >,
): LLMProvider {
  const counters: Record<string, number> = {};
  return {
    type: "ollama",
    label: "test",
    model: "test",
    raw: () => Promise.resolve("{}"),
    complete: (system: string) => {
      const lower = system.toLowerCase();
      const role = lower.includes("eres testing")
        ? "testing"
        : lower.includes("eres develop")
          ? "develop"
          : "orchestrator";
      counters[role] = (counters[role] ?? 0) + 1;
      const handler = overrides[role];
      if (!handler) throw new Error(`rol sin handler: ${role}`);
      return Promise.resolve(handler(counters[role]));
    },
  };
}

const PLAN = {
  outcome: "plan",
  tasks: [
    {
      description: "Añadir hola mundo",
      acceptance_check: { type: "file_exists", path: "/hola.html" },
    },
  ],
};

const CHANGES = {
  changes: [{ path: "/hola.html", content: "<html>hola</html>" }],
  summary: "Hecho.",
};

const PASS = { pass: true, reasons: ["ok"] };

async function drive(
  store: Store,
  provider: LLMProvider | null,
  runId: string,
) {
  const deps = { store, resolveProvider: () => Promise.resolve(provider) };
  return advance(deps, runId);
}

describe("resumeRun (reanudar desde error)", () => {
  it("solo acepta ejecuciones en error", async () => {
    const store = createMemoryStore(SEED);
    const run = await store.createRun({
      request: "x",
      maxCycles: 5,
      providerSnapshot: "test",
    });
    await expect(resumeRun(store, run.id)).rejects.toThrow(RecoveryError);
    await expect(resumeRun(store, "no-existe")).rejects.toThrow(/no encontrada/);
  });

  it("reanuda desde el paso de interrupción conservando el trabajo previo", async () => {
    const store = createMemoryStore(SEED);
    const run = await store.createRun({
      request: "Añade hola mundo",
      maxCycles: 5,
      providerSnapshot: "test",
    });

    // orchestrate OK → develop explota (LLM caído)
    await drive(store, fakeProvider({ orchestrator: () => PLAN }), run.id);
    const errored = await drive(
      store,
      fakeProvider({
        orchestrator: () => PLAN,
        develop: () => {
          throw new Error("LLM caído");
        },
      }),
      run.id,
    );
    expect(errored.status).toBe("error");
    // La foto del sandbox se capturó al orquestar
    expect(errored.sandboxSnapshot).toEqual(
      Object.fromEntries(SEED.map((f) => [f.path, f.content])),
    );
    // La tarea quedó failed (no transitoria) por la limpieza SC-006
    let tasks = await store.getTasks(run.id);
    expect(tasks[0].status).toBe("failed");

    // El servicio vuelve: reanudar
    const resumed = await resumeRun(store, run.id);
    expect(resumed.status).toBe("running");
    expect(resumed.step).toBe("develop");
    expect(resumed.errorMessage).toBeNull();
    tasks = await store.getTasks(run.id);
    expect(tasks[0].status).toBe("pending");
    expect(tasks[0].lastFailureReason).toContain("LLM caído");

    // Y completa con el servicio recuperado
    const provider = fakeProvider({
      orchestrator: () => PLAN,
      develop: () => CHANGES,
      testing: () => PASS,
    });
    let current = await drive(store, provider, run.id);
    let guard = 0;
    while (!isTerminal(current) && guard < 10) {
      guard += 1;
      current = await drive(store, provider, run.id);
    }
    expect(current.status).toBe("completed");
    expect(await store.sandboxRead("/hola.html")).toBe("<html>hola</html>");
  });
});

describe("revertRun (revertir cambios)", () => {
  it("restaura el sandbox a la foto previa de la ejecución", async () => {
    const store = createMemoryStore(SEED);
    const run = await store.createRun({
      request: "Añade hola mundo",
      maxCycles: 5,
      providerSnapshot: "test",
    });

    const provider = fakeProvider({
      orchestrator: () => PLAN,
      develop: () => CHANGES,
      testing: () => PASS,
    });
    let current = await drive(store, provider, run.id);
    let guard = 0;
    while (!isTerminal(current) && guard < 10) {
      guard += 1;
      current = await drive(store, provider, run.id);
    }
    expect(current.status).toBe("completed");
    expect(await store.sandboxRead("/hola.html")).not.toBeNull();

    await revertRun(store, run.id);

    const snapshot = await store.sandboxSnapshot();
    expect(snapshot).toEqual(
      Object.fromEntries(SEED.map((f) => [f.path, f.content])),
    );
  });

  it("rechaza revertir sin snapshot o con ejecución activa", async () => {
    const store = createMemoryStore(SEED);
    const run = await store.createRun({
      request: "x",
      maxCycles: 5,
      providerSnapshot: "test",
    });
    // Sin snapshot (no llegó a orquestar)
    await expect(revertRun(store, run.id)).rejects.toThrow(/no tiene foto/);

    // Con snapshot pero ejecución activa
    await store.updateRun(run.id, {
      sandboxSnapshot: { "/index.html": "<html>viejo</html>" },
    });
    await expect(revertRun(store, run.id)).rejects.toThrow(/en curso/);
  });
});

describe("resume desde completed_with_failures", () => {
  it("reactiva tareas falladas con ciclos renovados", async () => {
    const store = createMemoryStore(SEED);
    const run = await store.createRun({
      request: "Añade hola mundo",
      maxCycles: 1,
      providerSnapshot: "test",
    });

    // Testing siempre falla: agota el único ciclo y termina con fallos
    const failing = fakeProvider({
      orchestrator: () => PLAN,
      develop: () => CHANGES,
      testing: () => ({ pass: false, reasons: ["mal"] }),
    });
    let current = await drive(store, failing, run.id);
    let guard = 0;
    while (!isTerminal(current) && guard < 10) {
      guard += 1;
      current = await drive(store, failing, run.id);
    }
    expect(current.status).toBe("completed_with_failures");
    expect(current.cyclesUsed).toBe(1);

    const resumed = await resumeRun(store, run.id);
    expect(resumed.status).toBe("running");
    expect(resumed.cyclesUsed).toBe(0);
    expect(resumed.finalReport).toBeNull();
    const tasks = await store.getTasks(run.id);
    expect(tasks[0].status).toBe("pending");

    // Con Testing ya benigno, completa
    const benign = fakeProvider({
      orchestrator: () => PLAN,
      develop: () => CHANGES,
      testing: () => PASS,
    });
    current = await drive(store, benign, run.id);
    guard = 0;
    while (!isTerminal(current) && guard < 10) {
      guard += 1;
      current = await drive(store, benign, run.id);
    }
    expect(current.status).toBe("completed");
  });
});

describe("cerrojo de avance (FR-006)", () => {
  it("solo un cliente puede avanzar una ejecución dentro del TTL", async () => {
    const store = createMemoryStore(SEED);
    const run = await store.createRun({
      request: "x",
      maxCycles: 5,
      providerSnapshot: "test",
    });

    expect(await store.acquireRunLock(run.id, 120)).toBe(true);
    // Segundo cliente: ocupada
    expect(await store.acquireRunLock(run.id, 120)).toBe(false);
    // Liberar y readquirir
    await store.releaseRunLock(run.id);
    expect(await store.acquireRunLock(run.id, 120)).toBe(true);
    // TTL expirado: se puede readquirir aunque no se liberó
    await store.updateRun(run.id, {});
    const stale = await store.getRun(run.id);
    stale.lockedAt = new Date(Date.now() - 200_000);
    expect(await store.acquireRunLock(run.id, 120)).toBe(true);
  });
});
