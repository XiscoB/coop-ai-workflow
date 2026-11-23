import { NextResponse } from "next/server";
import { detectProvider, probeProvider } from "@/lib/llm";

export const runtime = "nodejs";

export async function GET() {
  const detection = await detectProvider();

  if (!detection.provider) {
    return NextResponse.json({
      mode: detection.mode,
      provider: null,
      probe: {
        ok: false,
        detail:
          detection.warning ??
          "Sin servicio de IA: arranca Ollama en local o configura LLM_API_*.",
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
