import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const after = Number(searchParams.get("after")) || undefined;

  const store = getStore();
  const run = await store.getRun(id);
  if (!run) {
    return NextResponse.json(
      { error: "Ejecución no encontrada.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const [tasks, activities] = await Promise.all([
    store.getTasks(id),
    store.listActivities(id, after),
  ]);

  return NextResponse.json({ run, tasks, activities });
}
