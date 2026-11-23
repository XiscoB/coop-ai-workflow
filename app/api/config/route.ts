import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { getEffectiveConfig, getTtsEnabled } from "@/lib/config";
import { detectProvider } from "@/lib/llm";

export const runtime = "nodejs";

function maskKey(key: string): string {
  if (!key) return "";
  return `••••${key.slice(-4)}`;
}

export async function GET() {
  const store = getStore();
  const [config, ttsEnabled] = await Promise.all([
    getEffectiveConfig(store),
    getTtsEnabled(store),
  ]);
  const detection = await detectProvider(config);

  return NextResponse.json({
    settings: {
      llm_mode: config.llmMode,
      local_llm_base_url: config.localLlmBaseUrl,
      local_llm_model: config.localLlmModel,
      llm_api_base_url: config.llmApiBaseUrl,
      llm_api_model: config.llmApiModel,
      llm_api_key: maskKey(config.llmApiKey),
      llm_min_interval_seconds: String(config.llmMinIntervalSeconds || ""),
      llm_fallback_base_url: config.llmFallbackBaseUrl,
      llm_fallback_model: config.llmFallbackModel,
      llm_fallback_key: maskKey(config.llmFallbackKey),
      tts_enabled: ttsEnabled,
    },
    detection: detection.provider
      ? { type: detection.provider.type, label: detection.provider.label }
      : null,
    warning: detection.warning,
  });
}

export async function POST(request: Request) {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Petición inválida.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const store = getStore();
  const allowed = [
    "llm_mode",
    "local_llm_base_url",
    "local_llm_model",
    "llm_api_base_url",
    "llm_api_model",
    "llm_min_interval_seconds",
    "llm_fallback_base_url",
    "llm_fallback_model",
    "tts_enabled",
  ];
  for (const key of allowed) {
    if (typeof body[key] === "string" && body[key] !== "") {
      await store.setSetting(key, body[key]);
    }
  }
  // Las keys solo se guardan si vienen nuevas completas: vacías o
  // enmascaradas (••••…) significa «conservar la actual». Jamás se devuelven
  // al cliente.
  for (const keyName of ["llm_api_key", "llm_fallback_key"] as const) {
    const newKey = body[keyName];
    if (
      typeof newKey === "string" &&
      newKey !== "" &&
      !newKey.startsWith("••••")
    ) {
      await store.setSetting(keyName, newKey);
    }
  }

  return GET();
}
