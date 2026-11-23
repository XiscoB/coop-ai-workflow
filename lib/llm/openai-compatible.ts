import { LLMError, TIMEOUT_MS } from "./complete";
import type { FetchLike } from "./ollama";

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function errorMessage(status: number, body: string): string {
  const short = body.trim().slice(0, 300);
  return `HTTP ${status}${short ? `: ${short}` : ""}`;
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

      let response = await this.post(payload);

      // Fallback ante 400 de validación: si el proveedor rechaza un parámetro
      // (p. ej. temperature fija en algunos modelos), se reintenta sin él y no
      // se vuelve a enviar en lo que dura el cliente (docs/arquitectura-llm.md).
      for (const param of ["temperature"]) {
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
        throw new LLMError(errorMessage(response.status, body));
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
