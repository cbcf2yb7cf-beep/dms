import "server-only";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Für API-Routen: angemeldeter Benutzer oder eine 401-Antwort. */
export async function apiUser() {
  const session = await auth();
  const user = session?.user?.id ? db().select().from(users).where(eq(users.id, session.user.id)).get() : undefined;
  return user ? { user } : { response: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
}
