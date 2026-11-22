import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { users, type User } from "./schema";
import { isLocal } from "@/lib/local";

/** Beim Serverstart: Datenbank öffnen (migriert) und den ersten Benutzer anlegen, falls keiner existiert. */
export async function bootstrap() {
  if (isLocal()) {
    ensureLocalUser();
    return;
  }
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

/** Mac-App: der eine lokale Benutzer (ohne nutzbares Passwort). Name kommt vom Mac-Konto. */
export function ensureLocalUser(): User {
  const existing = db().select().from(users).limit(1).get();
  if (existing) return existing;
  const user: User = {
    id: randomUUID(),
    email: "lokal@dms.app",
    name: process.env.DMS_USER_NAME?.trim() || "Ich",
    passwordHash: bcrypt.hashSync(randomBytes(32).toString("hex"), 10),
    role: "ADMIN",
    totpSecret: null,
    totpPendingSecret: null,
    totpEnabledAt: null,
    totpLastStep: null,
    totpRecovery: null,
    createdAt: new Date(),
  };
  db().insert(users).values(user).run();
  console.info(`[db] Lokaler Benutzer angelegt: ${user.name}`);
  return user;
}
