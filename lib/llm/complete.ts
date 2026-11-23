export class LLMError extends Error {}

export interface CompleteOptions {
  temperature?: number;
  requiredKeys?: string[];
}

export type RawCall = (temperature: number) => Promise<string>;

export const BACKOFF_SECONDS = [2, 5, 10] as const;
export const TIMEOUT_MS = 120_000;

export function parseJsonDefensive(raw: string): Record<string, unknown> {
  let clean = raw.trim();
  for (const fence of ["```json", "```"]) {
    if (clean.startsWith(fence)) clean = clean.slice(fence.length);
  }
  if (clean.endsWith("```")) clean = clean.slice(0, -3);
  const parsed: unknown = JSON.parse(clean.trim());
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new LLMError("la respuesta no es un objeto JSON");
  }
  return parsed as Record<string, unknown>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function completeWithRetries(
  call: RawCall,
  options: CompleteOptions = {},
): Promise<Record<string, unknown>> {
  const temperature = options.temperature ?? 0.1;
  const required = options.requiredKeys ?? [];
  let lastError: unknown = null;

  for (let attempt = 0; attempt < BACKOFF_SECONDS.length; attempt++) {
    try {
      const raw = await call(temperature);
      const data = parseJsonDefensive(raw);
      const missing = required.filter((key) => !(key in data));
      if (missing.length > 0) {
        throw new LLMError(
          `respuesta sin campos obligatorios: ${missing.join(", ")}`,
        );
      }
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < BACKOFF_SECONDS.length - 1) {
        await sleep(BACKOFF_SECONDS[attempt] * 1000);
      }
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new LLMError(
    `el LLM falló tras ${BACKOFF_SECONDS.length} intentos: ${reason}`,
  );
}
