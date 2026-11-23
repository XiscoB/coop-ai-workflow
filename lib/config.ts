export type LlmMode = "auto" | "local" | "api";

export interface AppConfig {
  llmMode: LlmMode;
  localLlmBaseUrl: string;
  localLlmModel: string;
  llmApiBaseUrl: string;
  llmApiModel: string;
  llmApiKey: string;
  llmMinIntervalSeconds: number;
  llmFallbackBaseUrl: string;
  llmFallbackModel: string;
  llmFallbackKey: string;
  agentModels: {
    orchestrator?: string;
    develop?: string;
    testing?: string;
  };
}

function readMode(value: string | undefined): LlmMode {
  if (value === "local" || value === "api" || value === "auto") return value;
  return "auto";
}

export function getConfig(): AppConfig {
  return {
    llmMode: readMode(process.env.LLM_MODE),
    localLlmBaseUrl:
      process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434",
    localLlmModel: process.env.LOCAL_LLM_MODEL ?? "qwen2.5-coder",
    llmApiBaseUrl: process.env.LLM_API_BASE_URL ?? "",
    llmApiModel: process.env.LLM_API_MODEL ?? "",
    llmApiKey: process.env.LLM_API_KEY ?? "",
    llmMinIntervalSeconds: Number(process.env.LLM_MIN_INTERVAL_SECONDS) || 0,
    llmFallbackBaseUrl: process.env.LLM_FALLBACK_BASE_URL ?? "",
    llmFallbackModel: process.env.LLM_FALLBACK_MODEL ?? "",
    llmFallbackKey: process.env.LLM_FALLBACK_KEY ?? "",
    agentModels: {
      orchestrator: process.env.ORCHESTRATOR_MODEL || undefined,
      develop: process.env.DEVELOP_MODEL || undefined,
      testing: process.env.TESTING_MODEL || undefined,
    },
  };
}

export function getAuthConfig() {
  return {
    user: process.env.APP_USER ?? "",
    password: process.env.APP_PASSWORD ?? "",
    secret: process.env.AUTH_SECRET ?? "",
  };
}

/** Claves de ajustes en BD que pisan las variables de entorno (spec 004). */
const SETTING_TO_ENV = {
  llm_mode: "llmMode",
  local_llm_base_url: "localLlmBaseUrl",
  local_llm_model: "localLlmModel",
  llm_api_base_url: "llmApiBaseUrl",
  llm_api_model: "llmApiModel",
  llm_api_key: "llmApiKey",
  llm_min_interval_seconds: "llmMinIntervalSeconds",
  llm_fallback_base_url: "llmFallbackBaseUrl",
  llm_fallback_model: "llmFallbackModel",
  llm_fallback_key: "llmFallbackKey",
} as const;

/**
 * Configuración efectiva: ajuste en BD si existe, si no variable de entorno,
 * si no valor por defecto (FR-002). La API key guardada en BD vive solo en el
 * servidor; nunca se devuelve al navegador.
 */
export async function getEffectiveConfig(store?: {
  getSettings(): Promise<Record<string, string>>;
}): Promise<AppConfig> {
  const config = getConfig();
  if (!store) return config;
  let settings: Record<string, string> = {};
  try {
    settings = await store.getSettings();
  } catch {
    return config;
  }
  for (const [key, prop] of Object.entries(SETTING_TO_ENV)) {
    const value = settings[key];
    if (value !== undefined && value !== "") {
      if (prop === "llmMode") {
        config.llmMode = readMode(value);
      } else if (prop === "llmMinIntervalSeconds") {
        config.llmMinIntervalSeconds = Number(value) || 0;
      } else {
        config[prop] = value;
      }
    }
  }
  return config;
}

/** `tts_enabled` en BD (defecto: activado). */
export async function getTtsEnabled(store?: {
  getSettings(): Promise<Record<string, string>>;
}): Promise<boolean> {
  if (!store) return true;
  try {
    const settings = await store.getSettings();
    return settings.tts_enabled !== "0";
  } catch {
    return true;
  }
}
