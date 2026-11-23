import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { advance, isTerminal } from "@/lib/engine/runner";
import { detectProvider, providerForRole, type AgentRole } from "@/lib/llm";
import { getConfig } from "@/lib/config";

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

  const config = getConfig();
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

  const resolveProvider = (role: AgentRole) =>
    Promise.resolve(providerForRole(detection, role, config));

  const run = await advance({ store, resolveProvider }, id);

  const [tasks, activities] = await Promise.all([
    store.getTasks(id),
    store.listActivities(id),
  ]);

  return NextResponse.json({ run, tasks, activities });
}
