import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { RecoveryError, resumeRun } from "@/lib/engine/recovery";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const run = await resumeRun(getStore(), id);
    return NextResponse.json({ run });
  } catch (error) {
    if (error instanceof RecoveryError) {
      const status = error.code === "RUN_NOT_FOUND" ? 404 : 409;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      );
    }
    throw error;
  }
}
