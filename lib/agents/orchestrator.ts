import type { LLMProvider } from "@/lib/llm";
import type { AcceptanceCheck } from "@/lib/sandbox/checks";

export interface PlannedTask {
  description: string;
  acceptance_check: AcceptanceCheck;
}

export interface OrchestrationResult {
  kind: "plan";
  tasks: PlannedTask[];
}

export interface OrchestrationRejection {
  kind: "rejected";
  reason: string;
}

export type OrchestrationOutcome = OrchestrationResult | OrchestrationRejection;

const SYSTEM_PROMPT = `Eres el Orquestador de un equipo de 3 agentes de IA que mantiene una pequeña web estática de una empresa ficticia (HTML, CSS y JS sencillos).

Tu trabajo: recibir una petición del usuario y descomponerla en tareas concretas y pequeñas para el agente Develop.

Reglas:
- Si la petición está vacía, es ininteligible o no tiene que ver con modificar la web, RECHÁZALA con una explicación breve y amable en español.
- Crea entre 1 y 6 tareas, ordenadas, cada una realizable de forma independiente sobre los ficheros de la web.
- Para cada tarea define un "acceptance_check" objetivable, usando SOLO uno de estos tipos:
  - {"type": "file_exists", "path": "/ruta.html"} — el fichero debe existir.
  - {"type": "element_exists", "path": "/ruta.html", "selector": "form"} — el elemento debe existir (selector: tag, #id, .clase o combinaciones como "form#contacto").
  - {"type": "link_exists", "from": "/index.html", "to": "/contacto.html"} — el fichero "from" debe enlazar a "to".
  - {"type": "llm_review", "criterion": "descripción del criterio cualitativo"} — solo si ninguno de los anteriores sirve.
- Las rutas empiezan por "/" y usan nombres de fichero en minúsculas y sin espacios.

Responde SOLO con un JSON con una de estas dos formas:
{"outcome": "plan", "tasks": [{"description": "…", "acceptance_check": {…}}, …]}
{"outcome": "rejected", "reason": "…"}`;

export async function orchestrate(
  provider: LLMProvider,
  request: string,
  sandboxFiles: string[],
): Promise<OrchestrationOutcome> {
  const prompt = `Petición del usuario: "${request}"

Ficheros actuales de la web:
${sandboxFiles.map((path) => `- ${path}`).join("\n")}

Descompón la petición en tareas o recházala según las reglas.`;

  const data = await provider.complete(SYSTEM_PROMPT, prompt, {
    requiredKeys: ["outcome"],
  });

  if (data.outcome === "rejected") {
    return {
      kind: "rejected",
      reason:
        typeof data.reason === "string"
          ? data.reason
          : "El Orquestador no puede atender esta petición.",
    };
  }

  const rawTasks = Array.isArray(data.tasks) ? data.tasks : [];
  const tasks: PlannedTask[] = rawTasks
    .filter(
      (item): item is { description: unknown; acceptance_check: unknown } =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      description: String(item.description ?? "Tarea sin descripción"),
      acceptance_check: normalizeCheck(item.acceptance_check),
    }))
    .slice(0, 6);

  if (tasks.length === 0) {
    return {
      kind: "rejected",
      reason:
        "El Orquestador no ha podido descomponer la petición en tareas concretas. Inténtalo con más detalle.",
    };
  }

  return { kind: "plan", tasks };
}

const CHECK_TYPES = new Set([
  "file_exists",
  "element_exists",
  "link_exists",
  "llm_review",
]);

function normalizeCheck(raw: unknown): AcceptanceCheck {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "type" in raw &&
    typeof (raw as { type: unknown }).type === "string" &&
    CHECK_TYPES.has((raw as { type: string }).type)
  ) {
    return raw as AcceptanceCheck;
  }
  return {
    type: "llm_review",
    criterion:
      "El cambio descrito en la tarea se ha aplicado correctamente y con calidad.",
  };
}
