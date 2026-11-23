import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createSessionValue,
  sessionCookieName,
  sessionMaxAge,
} from "@/lib/auth";
import { getAuthConfig } from "@/lib/config";
import { rateLimit, rateLimitReset } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Comparación en tiempo constante (hash previo para no filtrar longitud). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(request: Request) {
  // Freno de fuerza bruta: 5 intentos/minuto por IP.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (!rateLimit(`login:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      {
        error: "Demasiados intentos. Espera un minuto y prueba de nuevo.",
        code: "RATE_LIMITED",
      },
      { status: 429 },
    );
  }

  let body: { user?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Petición inválida.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const auth = getAuthConfig();
  if (!auth.user || !auth.password || !auth.secret) {
    return NextResponse.json(
      {
        error:
          "El acceso no está configurado en el servidor (APP_USER, APP_PASSWORD, AUTH_SECRET).",
        code: "AUTH_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const userOk = safeEqual(body.user ?? "", auth.user);
  const passwordOk = safeEqual(body.password ?? "", auth.password);
  if (!userOk || !passwordOk) {
    // Mensaje genérico: no revela cuál de los dos falló.
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos.", code: "BAD_CREDENTIALS" },
      { status: 401 },
    );
  }
  rateLimitReset(`login:${ip}`);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName(), await createSessionValue(auth.secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionMaxAge(),
    path: "/",
  });
  return response;
}
