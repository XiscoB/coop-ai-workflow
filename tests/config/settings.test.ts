import { describe, expect, it } from "vitest";
import { getEffectiveConfig, getTtsEnabled } from "@/lib/config";
import { createMemoryStore } from "@/lib/testing/memory-store";

describe("settings en el store (memoria)", () => {
  it("guarda, lee, actualiza y borra ajustes", async () => {
    const store = createMemoryStore();
    expect(await store.getSettings()).toEqual({});

    await store.setSetting("llm_mode", "api");
    await store.setSetting("llm_api_key", "sk-secreta-1234");
    expect(await store.getSettings()).toEqual({
      llm_mode: "api",
      llm_api_key: "sk-secreta-1234",
    });

    await store.setSetting("llm_mode", "local");
    expect((await store.getSettings()).llm_mode).toBe("local");

    await store.deleteSetting("llm_api_key");
    expect((await store.getSettings()).llm_api_key).toBeUndefined();
  });
});

describe("getEffectiveConfig (BD > env > defecto)", () => {
  it("los ajustes en BD pisan las variables de entorno", async () => {
    const store = createMemoryStore();
    await store.setSetting("llm_api_base_url", "https://api.groq.com/openai/v1");
    await store.setSetting("llm_api_model", "llama-3.3-70b-versatile");
    await store.setSetting("llm_api_key", "gsk_test");

    const config = await getEffectiveConfig(store);
    expect(config.llmApiBaseUrl).toBe("https://api.groq.com/openai/v1");
    expect(config.llmApiModel).toBe("llama-3.3-70b-versatile");
    expect(config.llmApiKey).toBe("gsk_test");
  });

  it("sin ajustes en BD usa env/defecto", async () => {
    const store = createMemoryStore();
    const config = await getEffectiveConfig(store);
    expect(config.llmMode).toBe("auto");
    expect(config.localLlmBaseUrl).toContain("localhost");
  });

  it("valores vacíos en BD no pisan el defecto", async () => {
    const store = createMemoryStore();
    await store.setSetting("llm_mode", "");
    const config = await getEffectiveConfig(store);
    expect(config.llmMode).toBe("auto");
  });
});

describe("getTtsEnabled", () => {
  it("activado por defecto, desactivable con 0", async () => {
    const store = createMemoryStore();
    expect(await getTtsEnabled(store)).toBe(true);
    await store.setSetting("tts_enabled", "0");
    expect(await getTtsEnabled(store)).toBe(false);
    await store.setSetting("tts_enabled", "1");
    expect(await getTtsEnabled(store)).toBe(true);
  });
});
