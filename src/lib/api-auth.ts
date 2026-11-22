import "server-only";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";

/** Für API-Routen: angemeldeter Benutzer oder eine 401-Antwort. */
export async function apiUser() {
  const user = await currentUser();
  return user ? { user } : { response: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
}
