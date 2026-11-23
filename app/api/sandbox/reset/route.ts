import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { resetSandbox } from "@/lib/sandbox/seed";

export const runtime = "nodejs";

export async function POST() {
  const store = getStore();
  const active = await store.findActiveRun();
  if (active) {
    return NextResponse.json(
      {
        error: "No se puede restablecer la web mientras hay una ejecución en curso.",
        code: "RUN_IN_PROGRESS",
      },
      { status: 409 },
    );
  }
  const count = await resetSandbox(store);
  return NextResponse.json({ ok: true, files: count });
}
