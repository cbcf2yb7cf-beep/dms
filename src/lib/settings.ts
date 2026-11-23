import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

export function getSetting(key: string): string | undefined {
  return db().select().from(appSettings).where(eq(appSettings.key, key)).get()?.value;
}

export function setSetting(key: string, value: string) {
  db().insert(appSettings).values({ key, value }).onConflictDoUpdate({ target: appSettings.key, set: { value } }).run();
}
