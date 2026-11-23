import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { getEffectiveConfig } from "@/lib/config";
import { detectProvider, probeProvider } from "@/lib/llm";

export const runtime = "nodejs";

export async function GET() {
  const store = getStore();
  const config = await getEffectiveConfig(store);
  const detection = await detectProvider(config);

  if (!detection.provider) {
    return NextResponse.json({
      mode: detection.mode,
      provider: null,
      probe: {
        ok: false,
        detail:
          detection.warning ??
          "Sin servicio de IA: arranca Ollama en local o configura una API externa en Configuración.",
      },
      warning: detection.warning,
    });
  }

  const probe = await probeProvider(detection.provider);
  return NextResponse.json({
    mode: detection.mode,
    provider: {
      type: detection.provider.type,
      label: detection.provider.label,
    },
    probe,
    warning: detection.warning,
  });
}
