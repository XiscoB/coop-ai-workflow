import { getConfig, type AppConfig } from "@/lib/config";
import {
  completeWithRetries,
  parseJsonDefensive,
  type CompleteOptions,
} from "./complete";
import { ollamaCall, type FetchLike } from "./ollama";
import { OpenAiCompatibleClient } from "./openai-compatible";

const PING_TIMEOUT_MS = 3_000;
const PROBE_TIMEOUT_MS = 30_000;

export interface LLMProvider {
  type: "ollama" | "openai_compatible";
  label: string;
  model: string;
  raw(system: string, prompt: string): Promise<string>;
  complete(
    system: string,
    prompt: string,
    options?: CompleteOptions,
  ): Promise<Record<string, unknown>>;
}

export interface DetectionResult {
  mode: AppConfig["llmMode"];
  provider: LLMProvider | null;
  warning: string | null;
}

function makeProvider(
  type: LLMProvider["type"],
  label: string,
  model: string,
  rawCall: (system: string, prompt: string) => Promise<(t: number) => Promise<string>>,
): LLMProvider {
  return {
    type,
    label,
    model,
    async raw(system, prompt) {
      const call = await rawCall(system, prompt);
      return call(0.1);
    },
    async complete(system, prompt, options) {
      const call = await rawCall(system, prompt);
      return completeWithRetries(call, options);
    },
  };
}

function ollamaProvider(
  config: AppConfig,
  fetchImpl?: FetchLike,
  model?: string,
): LLMProvider {
  const useModel = model ?? config.localLlmModel;
  return makeProvider(
    "ollama",
    `Ollama local (${useModel})`,
    useModel,
    (system, prompt) =>
      ollamaCall(config.localLlmBaseUrl, useModel, system, prompt, fetchImpl),
  );
}

function apiProvider(
  config: AppConfig,
  fetchImpl?: FetchLike,
  model?: string,
): LLMProvider {
  const useModel = model ?? config.llmApiModel;
  const client = new OpenAiCompatibleClient(
    config.llmApiBaseUrl,
    useModel,
    config.llmApiKey,
    fetchImpl,
  );
  return makeProvider(
    "openai_compatible",
    `API externa (${useModel})`,
    useModel,
    (system, prompt) => Promise.resolve(client.call(system, prompt)),
  );
}

async function ollamaResponds(
  baseUrl: string,
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  try {
    await fetchImpl(`${baseUrl.replace(/\/+$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    return true;
  } catch {
    return false;
  }
}

function apiConfigured(config: AppConfig): boolean {
  return Boolean(config.llmApiBaseUrl && config.llmApiModel && config.llmApiKey);
}

export async function detectProvider(
  config: AppConfig = getConfig(),
  fetchImpl: FetchLike = fetch,
): Promise<DetectionResult> {
  const mode = config.llmMode;

  if (mode === "local") {
    if (await ollamaResponds(config.localLlmBaseUrl, fetchImpl)) {
      return { mode, provider: ollamaProvider(config, fetchImpl), warning: null };
    }
    return {
      mode,
      provider: null,
      warning:
        "Ollama está seleccionado como servicio de IA pero no responde. " +
        "Arráncalo (`ollama serve`) o cambia LLM_MODE.",
    };
  }

  if (mode === "api") {
    if (apiConfigured(config)) {
      return { mode, provider: apiProvider(config, fetchImpl), warning: null };
    }
    return {
      mode,
      provider: null,
      warning:
        "El modo API está seleccionado pero falta configuración " +
        "(LLM_API_BASE_URL, LLM_API_MODEL o LLM_API_KEY).",
    };
  }

  // auto: Ollama si responde; si no, la API externa si está configurada.
  if (await ollamaResponds(config.localLlmBaseUrl, fetchImpl)) {
    return { mode, provider: ollamaProvider(config, fetchImpl), warning: null };
  }
  if (apiConfigured(config)) {
    return { mode, provider: apiProvider(config, fetchImpl), warning: null };
  }
  return {
    mode,
    provider: null,
    warning:
      "No hay servicio de IA disponible: Ollama no responde y no hay API " +
      "externa configurada. Arranca Ollama o define LLM_API_* en el entorno.",
  };
}

export type AgentRole = "orchestrator" | "develop" | "testing";

export function providerForRole(
  detection: DetectionResult,
  role: AgentRole,
  config: AppConfig = getConfig(),
  fetchImpl: FetchLike = fetch,
): LLMProvider | null {
  if (!detection.provider) return null;
  const override = config.agentModels[role];
  if (!override || override === detection.provider.model) {
    return detection.provider;
  }
  return detection.provider.type === "ollama"
    ? ollamaProvider(config, fetchImpl, override)
    : apiProvider(config, fetchImpl, override);
}

export interface ProbeResult {
  ok: boolean;
  detail: string | null;
}

export async function probeProvider(
  provider: LLMProvider,
): Promise<ProbeResult> {
  try {
    const raw = await Promise.race([
      provider.raw("", 'Responde solo con el JSON {"ok": true}'),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), PROBE_TIMEOUT_MS),
      ),
    ]);
    const data = parseJsonDefensive(raw);
    if (typeof data.ok !== "boolean" && data.ok !== "true") {
      return {
        ok: false,
        detail: "la respuesta de la sonda no contiene `ok`",
      };
    }
    return { ok: true, detail: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/401|403/.test(message)) {
      return { ok: false, detail: "la API key no es válida para esta URL" };
    }
    if (/timeout|abort/i.test(message)) {
      return {
        ok: false,
        detail: "el servicio no responde (comprueba la conexión o la URL)",
      };
    }
    return { ok: false, detail: `la sonda falló: ${message.slice(0, 200)}` };
  }
}
