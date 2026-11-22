"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";

export type FormState = { error?: string; message?: string } | undefined;

const passwordSchema = z
  .object({
    current: z.string().min(1, "Bitte das aktuelle Passwort eingeben."),
    next: z.string().min(12, "Das neue Passwort braucht mindestens 12 Zeichen."),
    repeat: z.string(),
  })
  .refine((v) => v.next === v.repeat, { message: "Die beiden neuen Passwörter stimmen nicht überein." });

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!(await bcrypt.compare(parsed.data.current, user.passwordHash))) return { error: "Das aktuelle Passwort stimmt nicht." };
  db().update(users).set({ passwordHash: await bcrypt.hash(parsed.data.next, 12) }).where(eq(users.id, user.id)).run();
  console.info(`[konto] Passwort geändert konto=${user.email}`);
  return { message: "Passwort geändert." };
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
