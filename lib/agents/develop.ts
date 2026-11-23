import type { LLMProvider } from "@/lib/llm";

export interface FileChange {
  path: string;
  content: string;
}

export interface DevelopResult {
  changes: FileChange[];
  summary: string;
}

const SYSTEM_PROMPT = `Eres Develop, el agente desarrollador de un equipo de 3 agentes de IA que mantiene una pequeña web estática (HTML, CSS y JS sencillos) de una empresa ficticia.

Tu trabajo: ejecutar UNA tarea de desarrollo modificando los ficheros necesarios.

Reglas:
- Devuelve los ficheros COMPLETOS que crees o modifiques (no diffs, no fragmentos).
- Mantén el estilo y la estructura de la web existente (mismas clases CSS, mismo header/footer, mismo tono en español).
- Si añades una página nueva, enlázala donde corresponda (p. ej. en la navegación de TODAS las páginas) — esto puede requerir modificar varios ficheros.
- Solo HTML, CSS y JS sencillo, sin dependencias externas.
- Céntrate en tu tarea; no refactorices lo que no se te pide.

Responde SOLO con un JSON con esta forma:
{"changes": [{"path": "/ruta.html", "content": "…contenido completo…"}], "summary": "Resumen breve en español de lo que has hecho."}`;

export async function develop(
  provider: LLMProvider,
  taskDescription: string,
  sandboxSnapshot: Record<string, string>,
  failureFeedback: string | null,
): Promise<DevelopResult> {
  const filesSection = Object.entries(sandboxSnapshot)
    .map(([path, content]) => `=== ${path} ===\n${content}`)
    .join("\n\n");

  let prompt = `Tarea a realizar: ${taskDescription}

Contenido actual de la web:
${filesSection}`;

  if (failureFeedback) {
    prompt += `

IMPORTANTE: Un intento anterior de esta tarea falló la revisión de Testing por este motivo:
"${failureFeedback}"
Corrige exactamente ese fallo manteniendo el resto del trabajo.`;
  }

  prompt += "\n\nEjecuta la tarea y devuelve los ficheros completos.";

  const data = await provider.complete(SYSTEM_PROMPT, prompt, {
    requiredKeys: ["changes", "summary"],
  });

  const rawChanges = Array.isArray(data.changes) ? data.changes : [];
  const changes: FileChange[] = rawChanges
    .filter(
      (item): item is { path: unknown; content: unknown } =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      path: String(item.path ?? ""),
      content: String(item.content ?? ""),
    }))
    .filter((change) => change.path.startsWith("/") && change.content !== "")
    .slice(0, 10);

  if (changes.length === 0) {
    throw new Error(
      "Develop no devolvió ningún cambio de fichero válido.",
    );
  }

  return {
    changes,
    summary:
      typeof data.summary === "string"
        ? data.summary
        : "Cambios aplicados sin resumen.",
  };
}
