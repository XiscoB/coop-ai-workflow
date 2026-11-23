import { describe, expect, it } from "vitest";
import { advance, isTerminal } from "@/lib/engine/runner";
import { createMemoryStore } from "@/lib/testing/memory-store";
import type { LLMProvider } from "@/lib/llm";
import type { Store } from "@/lib/store";

const SEED = [
  {
    path: "/index.html",
    content:
      '<html><body><nav><a href="servicios.html">Servicios</a></nav><main>Inicio</main></body></html>',
  },
  {
    path: "/servicios.html",
    content: "<html><body><p>Servicios</p></body></html>",
  },
];

type Script = Record<string, (call: number) => Record<string, unknown>>;

function fakeProvider(script: Script): LLMProvider {
  const counters: Record<string, number> = {};
  return {
    type: "ollama",
    label: "Ollama local (test)",
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
      const handler = script[role];
      if (!handler) throw new Error(`rol no esperado: ${role}`);
      return Promise.resolve(handler(counters[role]));
    },
  };
}

async function runUntilDone(store: Store, script: Script, runId: string) {
  const provider = fakeProvider(script);
  const deps = {
    store,
    resolveProvider: () => Promise.resolve(provider),
  };
  let run = await advance(deps, runId);
  let guard = 0;
  while (!isTerminal(run) && guard < 50) {
    guard += 1;
    run = await advance(deps, runId);
  }
  return run;
}

const CONTACTO_HTML =
  '<html><body><nav><a href="index.html">Inicio</a></nav><main><h2>Contacto</h2><form id="contacto"><input></form></main></body></html>';

const INDEX_CON_ENLACE =
  '<html><body><nav><a href="servicios.html">Servicios</a><a href="contacto.html">Contacto</a></nav><main>Inicio</main></body></html>';

const PLAN_SCRIPT: Script = {
  orchestrator: () => ({
    outcome: "plan",
    tasks: [
      {
        description: "Crear la página de contacto",
        acceptance_check: {
          type: "element_exists",
          path: "/contacto.html",
          selector: "form",
        },
      },
    ],
  }),
  develop: () => ({
    changes: [
      { path: "/contacto.html", content: CONTACTO_HTML },
      { path: "/index.html", content: INDEX_CON_ENLACE },
    ],
    summary: "Página de contacto creada y enlazada en la navegación.",
  }),
  testing: () => ({ pass: true, reasons: ["Todo correcto."] }),
};

describe("motor de ejecución (advance por pasos)", () => {
  it("camino feliz: orchestrate → develop → test → report hasta completed", async () => {
    const store = createMemoryStore(SEED);
    const run = await store.createRun({
      request: "Añade una página de contacto",
      maxCycles: 5,
      providerSnapshot: "test",
    });

    const final = await runUntilDone(store, PLAN_SCRIPT, run.id);

    expect(final.status).toBe("completed");
    expect(final.finalReport).toContain("Añade una página de contacto");
    expect(final.finishedAt).not.toBeNull();

    const tasks = await store.getTasks(run.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe("completed");
    expect(tasks[0].attempts).toBe(1);

    expect(await store.sandboxRead("/contacto.html")).toBe(CONTACTO_HTML);

    const activities = await store.listActivities(run.id);
    const agents = new Set(activities.map((a) => a.agent));
    expect(agents).toContain("orchestrator");
    expect(agents).toContain("develop");
    expect(agents).toContain("testing");
    expect(activities.some((a) => a.kind === "file_change")).toBe(true);
    expect(activities.some((a) => a.kind === "verdict")).toBe(true);
  });

  it("Testing falla dos veces y luego pasa: consume ciclos y completa", async () => {
    const store = createMemoryStore(SEED);
    const run = await store.createRun({
      request: "Añade una página de contacto",
      maxCycles: 5,
      providerSnapshot: "test",
    });

    const script: Script = {
      ...PLAN_SCRIPT,
      testing: (call) =>
        call <= 2
          ? { pass: false, reasons: [`fallo de prueba ${call}`] }
          : { pass: true, reasons: ["Ahora sí."] },
    };

    const final = await runUntilDone(store, script, run.id);

    expect(final.status).toBe("completed");
    expect(final.cyclesUsed).toBe(2);
    const tasks = await store.getTasks(run.id);
    expect(tasks[0].status).toBe("completed");
    expect(tasks[0].attempts).toBe(3);
    expect(tasks[0].lastFailureReason).toBeNull();
  });

  it("al agotar max_cycles termina completed_with_failures con informe", async () => {
    const store = createMemoryStore(SEED);
    const run = await store.createRun({
      request: "Añade una página de contacto",
      maxCycles: 2,
      providerSnapshot: "test",
    });

    const script: Script = {
      ...PLAN_SCRIPT,
      testing: () => ({ pass: false, reasons: ["el formulario está mal"] }),
    };

    const final = await runUntilDone(store, script, run.id);

    expect(final.status).toBe("completed_with_failures");
    expect(final.cyclesUsed).toBe(2);
    expect(final.finalReport).toContain("el formulario está mal");
    const tasks = await store.getTasks(run.id);
    expect(tasks[0].status).toBe("failed");
  });

  it("el Orquestador rechaza peticiones fuera de alcance", async () => {
    const store = createMemoryStore(SEED);
    const run = await store.createRun({
      request: "Háckeme el pentágono",
      maxCycles: 5,
      providerSnapshot: "test",
    });

    const script: Script = {
      orchestrator: () => ({
        outcome: "rejected",
        reason: "La petición no tiene que ver con modificar la web.",
      }),
      develop: () => {
        throw new Error("Develop no debería llamarse");
      },
      testing: () => {
        throw new Error("Testing no debería llamarse");
      },
    };

    const final = await runUntilDone(store, script, run.id);

    expect(final.status).toBe("rejected");
    expect(final.finalReport).toContain("modificar la web");
    expect(await store.getTasks(run.id)).toHaveLength(0);
  });

  it("sin proveedor de IA a mitad, la ejecución queda en error con motivo", async () => {
    const store = createMemoryStore(SEED);
    const run = await store.createRun({
      request: "Añade una página de contacto",
      maxCycles: 5,
      providerSnapshot: "test",
    });

    const deps = {
      store,
      resolveProvider: () => Promise.resolve(null),
    };

    const final = await advance(deps, run.id);

    expect(final.status).toBe("error");
    expect(final.errorMessage).toContain("No hay servicio de IA");
  });

  it("un error a mitad de paso no deja tareas «en curso» (SC-006)", async () => {
    const store = createMemoryStore(SEED);
    const run = await store.createRun({
      request: "Añade una página de contacto",
      maxCycles: 5,
      providerSnapshot: "test",
    });

    // El Orquestador funciona; Develop falla siempre (LLM caído a mitad).
    const failing = fakeProvider({
      orchestrator: PLAN_SCRIPT.orchestrator,
      develop: () => {
        throw new Error("el LLM falló tras 3 intentos");
      },
      testing: PLAN_SCRIPT.testing,
    });
    const deps = {
      store,
      resolveProvider: () => Promise.resolve(failing),
    };

    let current = await advance(deps, run.id); // orchestrate OK
    current = await advance(deps, run.id); // develop explota

    expect(current.status).toBe("error");
    const tasks = await store.getTasks(run.id);
    expect(
      tasks.some(
        (task) => task.status === "in_progress" || task.status === "in_review",
      ),
    ).toBe(false);
    expect(tasks[0].status).toBe("failed");
    expect(tasks[0].lastFailureReason).toContain("el LLM falló tras 3 intentos");
  });
});
