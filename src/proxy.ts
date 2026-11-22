import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { LOCAL_COOKIE } from "@/lib/local";

const PUBLIC = /^\/(login|api\/auth)(\/|$)/;

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Mac-App: nur mit dem Schlüssel der App, Login gibt es nicht.
  const localToken = process.env.DMS_LOCAL_TOKEN;
  if (localToken) {
    if (req.cookies.get(LOCAL_COOKIE)?.value !== localToken) {
      return new NextResponse("DMS ist nur über die DMS-App erreichbar.", { status: 403 });
    }
    if (pathname === "/login") return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // Server: alles privat außer Login und Auth-API. API-Routen antworten mit 401.
  if (PUBLIC.test(pathname)) return NextResponse.next();
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
  });
  if (!token) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt).*)"],
};
