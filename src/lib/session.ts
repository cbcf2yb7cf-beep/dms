import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

// Benutzer frisch aus der DB laden: gelöschte Konten wirken sofort, nicht erst bei Ablauf des JWT.
export async function requireUser() {
  const session = await auth();
  const user = session?.user?.id ? db().select().from(users).where(eq(users.id, session.user.id)).get() : undefined;
  if (!user) redirect("/login");
  return user;
}
