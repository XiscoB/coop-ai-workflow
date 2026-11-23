export class LLMError extends Error {}

export interface CompleteOptions {
  temperature?: number;
  requiredKeys?: string[];
  /** Tope de intentos en ESTE proveedor (defecto: 3; con 429, hasta 6). */
  maxAttempts?: number;
}

export type RawCall = (temperature: number) => Promise<string>;

export const BACKOFF_SECONDS = [2, 5, 10] as const;
/** Intentos extra cuando el proveedor pide Retry-After (429): la ventana TPM
 * es de 60 s y tres intentos no siempre la cruzan. */
const MAX_ATTEMPTS_429 = 6;
const MAX_WAIT_429_SECONDS = 45;
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
  const baseMax = options.maxAttempts ?? BACKOFF_SECONDS.length;
  let lastError: unknown = null;
  let saw429 = false;

  for (let attempt = 0; ; attempt++) {
    const maxAttempts = saw429
      ? Math.max(baseMax, MAX_ATTEMPTS_429)
      : baseMax;
    if (attempt >= maxAttempts) break;
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
      const retryAfter = (error as { retryAfterSeconds?: number })
        .retryAfterSeconds;
      if (retryAfter !== undefined) saw429 = true;
      const maxAttempts = saw429
        ? Math.max(baseMax, MAX_ATTEMPTS_429)
        : baseMax;
      if (attempt < maxAttempts - 1) {
        // Si el proveedor pide una espera concreta (429 Retry-After), se
        // respeta (tope 45 s); si no, backoff fijo 2/5/10 s.
        const waitSeconds =
          retryAfter !== undefined
            ? Math.min(retryAfter, MAX_WAIT_429_SECONDS)
            : BACKOFF_SECONDS[Math.min(attempt, BACKOFF_SECONDS.length - 1)];
        await sleep(waitSeconds * 1000);
      }
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  const attempts = saw429
    ? Math.max(baseMax, MAX_ATTEMPTS_429)
    : baseMax;
  throw new LLMError(`el LLM falló tras ${attempts} intentos: ${reason}`);
}
