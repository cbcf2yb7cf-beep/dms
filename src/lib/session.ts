import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureLocalUser } from "@/db/bootstrap";
import { isLocal } from "@/lib/local";

/** Angemeldeter Benutzer oder undefined. In der Mac-App immer der lokale Benutzer (der Proxy hat den App-Schlüssel geprüft). */
export async function currentUser() {
  if (isLocal()) return ensureLocalUser();
  const session = await auth();
  // Frisch aus der DB: gelöschte Konten wirken sofort, nicht erst bei Ablauf des JWT.
  return session?.user?.id ? db().select().from(users).where(eq(users.id, session.user.id)).get() : undefined;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
