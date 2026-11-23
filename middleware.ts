import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName, verifySessionValue } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? "";
  const cookie = request.cookies.get(sessionCookieName())?.value;
  const valid = await verifySessionValue(cookie, secret);

  if (valid) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Sesión no válida o caducada.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!login|api/login|_next/static|_next/image|favicon.ico).*)",
  ],
};
