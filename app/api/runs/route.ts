import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { getEffectiveConfig } from "@/lib/config";
import { detectProvider } from "@/lib/llm";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
  const store = getStore();
  const runs = await store.listRuns(limit);
  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  let body: { request?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Petición inválida.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const text = body.request?.trim() ?? "";
  if (text.length < 5) {
    return NextResponse.json(
      {
        error: "Describe la petición con un poco más de detalle.",
        code: "EMPTY_REQUEST",
      },
      { status: 422 },
    );
  }

  const store = getStore();
  const detection = await detectProvider(await getEffectiveConfig(store));
  if (!detection.provider) {
    return NextResponse.json(
      {
        error:
          detection.warning ??
          "No hay servicio de IA disponible. Configura Ollama o una API externa.",
        code: "NO_LLM_PROVIDER",
      },
      { status: 503 },
    );
  }

  let active;
  try {
    active = await store.findActiveRun();
  } catch {
    return NextResponse.json(
      {
        error:
          "No se puede conectar con la base de datos. Revisa DATABASE_URL.",
        code: "DB_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
  if (active) {
    return NextResponse.json(
      {
        error: `Ya hay una ejecución en curso («${active.request.slice(0, 80)}»). Espera a que termine.`,
        code: "RUN_IN_PROGRESS",
        activeRunId: active.id,
      },
      { status: 409 },
    );
  }

  const run = await store.createRun({
    request: text,
    maxCycles: 5,
    providerSnapshot: detection.provider.label,
  });

  return NextResponse.json({ id: run.id, status: run.status }, { status: 201 });
}
