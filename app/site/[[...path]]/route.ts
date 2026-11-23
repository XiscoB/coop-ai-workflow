import { NextResponse } from "next/server";
import { getStore } from "@/lib/db/store";
import { ensureSandboxSeeded } from "@/lib/sandbox/seed";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

type Params = { params: Promise<{ path?: string[] }> };

/**
 * Sirve la mini-web desde la BD con content-type real, para que /preview la
 * muestre navegable en un iframe (los enlaces relativos entre páginas
 * funcionan al estar servidas bajo el mismo prefijo /site/).
 */
export async function GET(_request: Request, { params }: Params) {
  const { path = [] } = await params;
  const store = getStore();
  await ensureSandboxSeeded(store);

  const requested = path.length === 0 ? "/index.html" : `/${path.join("/")}`;
  const content = await store.sandboxRead(requested);

  if (content === null) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const ext = requested.slice(requested.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  return new NextResponse(content, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
