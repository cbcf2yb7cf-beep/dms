import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

/** Beim Serverstart: Datenbank öffnen (migriert) und den ersten Benutzer anlegen, falls keiner existiert. */
export async function bootstrap() {
  const [{ count }] = db().select({ count: sql<number>`count(*)` }).from(users).all();
  if (count > 0) return;

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("[db] Kein Benutzer vorhanden und ADMIN_EMAIL/ADMIN_PASSWORD nicht gesetzt.");
    return;
  }
  db()
    .insert(users)
    .values({
      id: randomUUID(),
      email,
      name: process.env.ADMIN_NAME?.trim() || "Admin",
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      createdAt: new Date(),
    })
    .run();
  console.info(`[db] Erster Benutzer angelegt: ${email}`);
}
