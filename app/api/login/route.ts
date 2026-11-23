import { NextResponse } from "next/server";
import {
  createSessionValue,
  sessionCookieName,
  sessionMaxAge,
} from "@/lib/auth";
import { getAuthConfig } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  if (body.user !== auth.user || body.password !== auth.password) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos.", code: "BAD_CREDENTIALS" },
      { status: 401 },
    );
  }

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
