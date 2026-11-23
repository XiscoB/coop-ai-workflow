import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { DEFAULT_SYSTEM_PROMPT as orchestratorDefault } from "@/lib/agents/orchestrator";
import { DEFAULT_SYSTEM_PROMPT as developDefault } from "@/lib/agents/develop";
import { DEFAULT_SYSTEM_PROMPT as testingDefault } from "@/lib/agents/testing";

export const runtime = "nodejs";

const AGENTS = {
  orchestrator: { label: "Orquestador", default: orchestratorDefault },
  develop: { label: "Developer", default: developDefault },
  testing: { label: "Testing", default: testingDefault },
} as const;

type AgentKey = keyof typeof AGENTS;

export async function GET() {
  const store = getStore();
  let settings: Record<string, string> = {};
  try {
    settings = await store.getSettings();
  } catch {
    // sin tabla todavía: se muestran los prompts por defecto
  }

  const prompts = Object.fromEntries(
    (Object.keys(AGENTS) as AgentKey[]).map((key) => {
      const override = settings[`prompt_${key}`];
      return [
        key,
        {
          label: AGENTS[key].label,
          default: AGENTS[key].default,
          current: override || AGENTS[key].default,
          custom: Boolean(override),
        },
      ];
    }),
  );

  return NextResponse.json({ prompts });
}

export async function POST(request: Request) {
  let body: { agent?: string; prompt?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Petición inválida.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const agent = body.agent as AgentKey;
  if (!agent || !(agent in AGENTS)) {
    return NextResponse.json(
      { error: "Agente desconocido.", code: "BAD_AGENT" },
      { status: 422 },
    );
  }

  const store = getStore();
  const key = `prompt_${agent}`;
  if (typeof body.prompt === "string" && body.prompt.trim() !== "") {
    await store.setSetting(key, body.prompt);
  } else {
    // null o vacío: restablecer el prompt por defecto
    await store.deleteSetting(key);
  }

  return GET();
}
