import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@/lib/config";
import { detectProvider } from "@/lib/llm";

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    llmMode: "api",
    localLlmBaseUrl: "http://localhost:11434",
    localLlmModel: "qwen2.5-coder:7b",
    llmApiBaseUrl: "https://primario.example/v1",
    llmApiModel: "modelo-principal",
    llmApiKey: "key-principal",
    llmMinIntervalSeconds: 0,
    llmFallbackBaseUrl: "",
    llmFallbackModel: "",
    llmFallbackKey: "",
    agentModels: {},
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const withFallback = {
  llmFallbackBaseUrl: "https://respaldo.example/v1",
  llmFallbackModel: "modelo-respaldo",
  llmFallbackKey: "key-respaldo",
};

describe("proveedor con API de respaldo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("la etiqueta muestra primario + respaldo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    const detection = await detectProvider(config(withFallback), fetchMock);
    expect(detection.provider?.label).toContain("modelo-principal");
    expect(detection.provider?.label).toContain("respaldo (modelo-respaldo)");
  });

  it("el primario responde: no se usa el respaldo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: '{"ok": true}' } }] }),
    );
    const detection = await detectProvider(config(withFallback), fetchMock);
    const promise = detection.provider!.complete("s", "p", {});
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ ok: true });
    expect(
      fetchMock.mock.calls.every(([url]) =>
        String(url).includes("primario.example"),
      ),
    ).toBe(true);
  });

  it("el primario agota sus 2 intentos y salta al respaldo", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      calls.push(String(url));
      if (String(url).includes("primario.example")) {
        return new Response("boom", { status: 500 });
      }
      return jsonResponse({
        choices: [{ message: { content: '{"ok": true, "via": "respaldo"}' } }],
      });
    });
    const detection = await detectProvider(config(withFallback), fetchMock);
    const promise = detection.provider!.complete("s", "p", {});
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ ok: true, via: "respaldo" });

    const primarias = calls.filter((c) => c.includes("primario.example"));
    const respaldo = calls.filter((c) => c.includes("respaldo.example"));
    expect(primarias).toHaveLength(2);
    expect(respaldo.length).toBeGreaterThanOrEqual(1);
  });

  it("sin respaldo configurado, la etiqueta no lo menciona", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    const detection = await detectProvider(config(), fetchMock);
    expect(detection.provider?.label).not.toContain("respaldo");
  });
});
