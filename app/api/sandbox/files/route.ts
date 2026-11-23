import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { ensureSandboxSeeded, resetSandbox } from "@/lib/sandbox/seed";

export const runtime = "nodejs";

export async function GET() {
  const store = getStore();
  await ensureSandboxSeeded(store);
  const files = await store.sandboxList();
  return NextResponse.json({ files });
}
