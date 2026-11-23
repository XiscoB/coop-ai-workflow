import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { ensureSandboxSeeded } from "@/lib/sandbox/seed";
import { getSandboxStatus } from "@/lib/sandbox/status";

export const runtime = "nodejs";

export async function GET() {
  const store = getStore();
  await ensureSandboxSeeded(store);
  return NextResponse.json(await getSandboxStatus(store));
}
