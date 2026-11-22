import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Alles ist privat: außer Login, Auth-API und statischen Dateien braucht jede
// Anfrage eine Session. API-Routen antworten mit 401 statt Weiterleitung.
export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
  });

  if (!token) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt).*)"],
};
