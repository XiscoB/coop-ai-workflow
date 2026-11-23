import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { RecoveryError, revertRun } from "@/lib/engine/recovery";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const run = await revertRun(getStore(), id);
    return NextResponse.json({ run });
  } catch (error) {
    if (error instanceof RecoveryError) {
      const status =
        error.code === "RUN_NOT_FOUND"
          ? 404
          : error.code === "NO_SNAPSHOT"
            ? 422
            : 409;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      );
    }
    throw error;
  }
}
