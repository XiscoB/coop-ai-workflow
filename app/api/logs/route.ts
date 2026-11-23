import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
  const store = getStore();
  const events = await store.listSystemActivities(limit);
  return NextResponse.json({ events });
}
