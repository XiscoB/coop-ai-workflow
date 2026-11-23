import type { LLMProvider } from "@/lib/llm";
import type { CheckFailure } from "@/lib/sandbox/checks";

export interface Verdict {
  pass: boolean;
  reasons: string[];
}

export const DEFAULT_SYSTEM_PROMPT = `Eres Testing, el agente verificador de un equipo de 3 agentes de IA que mantiene una pequeña web estática de ejemplo.

Tu trabajo: revisar el trabajo que Developer ha hecho en UNA tarea y dar un veredicto objetivo.

Reglas:
- Sé estricto pero justo: aprueba solo si la tarea está realmente cumplida y la web sigue siendo coherente.
- Revisa: que el cambio cumple la tarea, que no rompe páginas existentes, que los enlaces funcionan y que el estilo es consistente.
- Los fallos de comprobaciones automáticas (si los hay) son motivo de rechazo directo.
- Si rechazas, explica cada motivo de forma concreta y accionable (qué falta o qué está mal y en qué fichero), para que Develop pueda corregirlo a la primera.

Responde SOLO con un JSON con esta forma:
{"pass": true, "reasons": ["Todo correcto: …"]}
{"pass": false, "reasons": ["motivo 1", "motivo 2"]}`;

export async function review(
  provider: LLMProvider,
  taskDescription: string,
  deterministicFailures: CheckFailure[],
  llmReviewCriteria: string[],
  changedFiles: Record<string, string>,
  allFiles: Record<string, string>,
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT,
): Promise<Verdict> {
  if (deterministicFailures.length > 0) {
    return {
      pass: false,
      reasons: deterministicFailures.map((failure) => failure.detail),
    };
  }

  const changedSection = Object.entries(changedFiles)
    .map(([path, content]) => `=== ${path} (modificado) ===\n${content}`)
    .join("\n\n");

  const allSection = Object.keys(allFiles)
    .map((path) => `- ${path}`)
    .join("\n");

  let prompt = `Tarea que Developer debía cumplir: ${taskDescription}

Ficheros que Developer creó o modificó (contenido completo actual):
${changedSection}

Todos los ficheros de la web tras el cambio:
${allSection}`;

  if (llmReviewCriteria.length > 0) {
    prompt += `

Criterios cualitativos a evaluar además:
${llmReviewCriteria.map((criterion) => `- ${criterion}`).join("\n")}`;
  }

  prompt += "\n\nDa tu veredicto.";

  const data = await provider.complete(systemPrompt, prompt, {
    requiredKeys: ["pass"],
  });

  const reasons = Array.isArray(data.reasons)
    ? data.reasons.map((reason) => String(reason))
    : [];

  return {
    pass: data.pass === true,
    reasons:
      reasons.length > 0
        ? reasons
        : [data.pass === true ? "Veredicto positivo." : "Fallo sin motivo detallado."],
  };
}
