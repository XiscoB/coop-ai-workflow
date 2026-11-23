export type LlmMode = "auto" | "local" | "api";

export interface AppConfig {
  llmMode: LlmMode;
  localLlmBaseUrl: string;
  localLlmModel: string;
  llmApiBaseUrl: string;
  llmApiModel: string;
  llmApiKey: string;
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
