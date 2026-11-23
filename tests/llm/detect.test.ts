import { describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@/lib/config";
import { detectProvider, probeProvider, type LLMProvider } from "@/lib/llm";

function baseConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    llmMode: "auto",
    localLlmBaseUrl: "http://localhost:11434",
    localLlmModel: "qwen2.5-coder",
    llmApiBaseUrl: "",
    llmApiModel: "",
    llmApiKey: "",
    agentModels: {},
    ...overrides,
  };
}

const ollamaUp = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
const ollamaDown = vi.fn().mockRejectedValue(new Error("connection refused"));

describe("detectProvider", () => {
  it("auto: usa Ollama si responde", async () => {
    const result = await detectProvider(baseConfig(), ollamaUp);
    expect(result.provider?.type).toBe("ollama");
    expect(result.provider?.label).toContain("qwen2.5-coder");
    expect(result.warning).toBeNull();
  });

  it("auto: sin Ollama y con API configurada, usa la API externa", async () => {
    const result = await detectProvider(
      baseConfig({
        llmApiBaseUrl: "https://api.deepseek.com/v1",
        llmApiModel: "deepseek-chat",
        llmApiKey: "sk-test",
      }),
      ollamaDown,
    );
    expect(result.provider?.type).toBe("openai_compatible");
    expect(result.provider?.label).toContain("deepseek-chat");
  });

  it("auto: sin Ollama ni API, devuelve null con aviso claro", async () => {
    const result = await detectProvider(baseConfig(), ollamaDown);
    expect(result.provider).toBeNull();
    expect(result.warning).toMatch(/Ollama no responde/);
  });

  it("local: Ollama caído → null con aviso, SIN fallback a la API", async () => {
    const result = await detectProvider(
      baseConfig({
        llmMode: "local",
        llmApiBaseUrl: "https://api.deepseek.com/v1",
        llmApiModel: "deepseek-chat",
        llmApiKey: "sk-test",
      }),
      ollamaDown,
    );
    expect(result.provider).toBeNull();
    expect(result.warning).toMatch(/Arráncalo/);
  });

  it("api: sin key → null con aviso de configuración", async () => {
    const result = await detectProvider(
      baseConfig({
        llmMode: "api",
        llmApiBaseUrl: "https://api.deepseek.com/v1",
        llmApiModel: "deepseek-chat",
      }),
      ollamaDown,
    );
    expect(result.provider).toBeNull();
    expect(result.warning).toMatch(/falta configuración/);
  });
});

describe("probeProvider", () => {
  function fakeProvider(raw: () => Promise<string>): LLMProvider {
    return {
      type: "openai_compatible",
      label: "API externa (test)",
      model: "test",
      raw,
      complete: () => Promise.resolve({}),
    };
  }

  it("ok cuando la sonda devuelve un JSON con ok", async () => {
    const result = await probeProvider(
      fakeProvider(() => Promise.resolve('{"ok": true}')),
    );
    expect(result).toEqual({ ok: true, detail: null });
  });

  it("explica cuando la key no es válida (401/403)", async () => {
    const result = await probeProvider(
      fakeProvider(() => Promise.reject(new Error("HTTP 401: unauthorized"))),
    );
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/API key no es válida/);
  });

  it("explica cuando el servicio no responde", async () => {
    const result = await probeProvider(
      fakeProvider(() => Promise.reject(new Error("aborted: timeout"))),
    );
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/no responde/);
  });

  it("explica cuando la respuesta no es usable", async () => {
    const result = await probeProvider(
      fakeProvider(() => Promise.resolve("texto sin json")),
    );
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/la sonda falló/);
  });
});
