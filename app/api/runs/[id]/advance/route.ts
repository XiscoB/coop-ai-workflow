import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { advance, isTerminal } from "@/lib/engine/runner";
import {
  detectProvider,
  providerForRole,
  setFallbackHook,
  type AgentRole,
} from "@/lib/llm";
import { setRateLimitHook } from "@/lib/llm/openai-compatible";
import { getEffectiveConfig } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const store = getStore();

  const existing = await store.getRun(id);
  if (!existing) {
    return NextResponse.json(
      { error: "Ejecución no encontrada.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  if (isTerminal(existing)) {
    return NextResponse.json(
      { error: "La ejecución ya terminó.", code: "RUN_NOT_ACTIVE" },
      { status: 409 },
    );
  }

  const config = await getEffectiveConfig(store);
  const detection = await detectProvider(config);
  if (!detection.provider) {
    return NextResponse.json(
      {
        error:
          detection.warning ??
          "No hay servicio de IA disponible en este momento.",
        code: "NO_LLM_PROVIDER",
      },
      { status: 503 },
    );
  }

  // Cerrojo de avance (spec 003, FR-006): dos clientes (p. ej. dos pestañas)
  // no pueden ejecutar pasos de la misma ejecución en paralelo.
  const locked = await store.acquireRunLock(id, 120);
  if (!locked) {
    return NextResponse.json(
      {
        error:
          "Otro cliente está avanzando esta ejecución ahora mismo. Recarga la página en unos segundos.",
        code: "RUN_BUSY",
      },
      { status: 409 },
    );
  }

  const resolveProvider = (role: AgentRole) =>
    Promise.resolve(providerForRole(detection, role, config));

  // Los 429 del proveedor gratuito se registran en el timeline de la
  // ejecución (visibilidad del modo lento en la UI).
  setRateLimitHook((retryAfterSeconds) => {
    void store
      .addActivity({
        runId: id,
        agent: "system",
        kind: "status_change",
        content: `El proveedor gratuito está al límite (rate limit): espera de ~${Math.round(retryAfterSeconds)} s antes de reintentar (modo lento automático).`,
      })
      .catch(() => {});
  });
  // Y el cambio al proveedor de respaldo, si lo hay.
  setFallbackHook((fromLabel, toLabel) => {
    void store
      .addActivity({
        runId: id,
        agent: "system",
        kind: "status_change",
        content: `El proveedor principal falló; se cambia automáticamente al respaldo (${toLabel}).`,
      })
      .catch(() => {});
  });

  try {
    const run = await advance({ store, resolveProvider }, id);

    const [tasks, activities] = await Promise.all([
      store.getTasks(id),
      store.listActivities(id),
    ]);

    return NextResponse.json({ run, tasks, activities });
  } finally {
    setRateLimitHook(null);
    setFallbackHook(null);
    await store.releaseRunLock(id);
  }
}
