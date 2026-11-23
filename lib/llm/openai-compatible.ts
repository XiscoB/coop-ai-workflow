import { LLMError, TIMEOUT_MS } from "./complete";
import type { FetchLike } from "./ollama";

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/** Error HTTP con indicación de reintento del proveedor (429). */
export class HttpError extends LLMError {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function errorMessage(status: number, body: string): string {
  const short = body.trim().slice(0, 300);
  return `HTTP ${status}${short ? `: ${short}` : ""}`;
}

/**
 * Segundos que el proveedor pide esperar antes de reintentar (429):
 * cabecera Retry-After o texto «try again in X s» del cuerpo (Groq).
 */
export function parseRetryAfter(response: Response, body: string): number | undefined {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return seconds;
  }
  const match = body.match(/try again in ([\d.]+)s/i);
  return match ? Number(match[1]) : undefined;
}

export class OpenAiCompatibleClient {
  private readonly url: string;
  private readonly omittedParams = new Set<string>();

  constructor(
    baseUrl: string,
    private readonly model: string,
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    this.url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  }

  call(system: string, prompt: string): (temperature: number) => Promise<string> {
    return async (temperature) => {
      const payload: Record<string, unknown> = {
        model: this.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      };
      if (!this.omittedParams.has("temperature")) {
        payload.temperature = temperature;
      }
      if (!this.omittedParams.has("reasoning_effort")) {
        // Tareas mecánicas (JSON, ficheros pequeños): razonamiento mínimo.
        // Los modelos razonadores pueden consumir todo el presupuesto de
        // salida pensando y devolver la respuesta vacía (caso Groq gpt-oss).
        // Si el proveedor lo rechaza con 400, no se vuelve a enviar.
        payload.reasoning_effort = "low";
      }

      let response = await this.post(payload);

      // Fallback ante 400 de validación: si el proveedor rechaza un parámetro
      // (p. ej. temperature fija, response_format o reasoning_effort no
      // soportados), se reintenta sin él y no se vuelve a enviar en lo que
      // dura el cliente (docs/arquitectura-llm.md).
      for (const param of ["temperature", "response_format", "reasoning_effort"]) {
        if (
          response.status === 400 &&
          param in payload &&
          (await response.clone().text().catch(() => "")).includes(param)
        ) {
          this.omittedParams.add(param);
          delete payload[param];
          response = await this.post(payload);
        }
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new HttpError(
          response.status,
          errorMessage(response.status, body),
          parseRetryAfter(response, body),
        );
      }
      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new LLMError("la API no devolvió `choices[0].message.content`");
      }
      return content;
    };
  }

  private post(payload: Record<string, unknown>): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    return this.fetchImpl(this.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }
}
