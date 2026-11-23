import { LLMError, TIMEOUT_MS } from "./complete";

export type FetchLike = typeof fetch;

export async function ollamaCall(
  baseUrl: string,
  model: string,
  system: string,
  prompt: string,
  fetchImpl: FetchLike = fetch,
): Promise<(temperature: number) => Promise<string>> {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/generate`;
  return async (temperature) => {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        system,
        prompt,
        stream: false,
        format: "json",
        options: { temperature, num_ctx: 4096 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const body = (await response.text().catch(() => "")).slice(0, 300);
      throw new LLMError(
        `Ollama respondió HTTP ${response.status}${body ? `: ${body}` : ""}`,
      );
    }
    const data = (await response.json()) as { response?: string };
    if (typeof data.response !== "string") {
      throw new LLMError("Ollama no devolvió el campo `response`");
    }
    return data.response;
  };
}
