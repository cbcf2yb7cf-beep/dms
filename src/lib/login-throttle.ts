import { inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { loginThrottle } from "@/db/schema";

// Bremse gegen Passwort-Raten (wie in Orga): je Konto und je IP. Nach LIMIT
// Fehlversuchen gesperrt, jede weitere Sperre doppelt so lang (15 Min. → … 24 Std.).
// Nach 24 Std. ohne Fehlversuch vergessen. In der DB, damit ein Neustart nichts zurücksetzt.

const LIMIT = { account: 5, ip: 20 } as const;
const BASE_LOCK_MS = 15 * 60 * 1000;
const MAX_LOCK_MS = 24 * 60 * 60 * 1000;
const FORGET_MS = 24 * 60 * 60 * 1000;

type Kind = keyof typeof LIMIT;
type Key = { key: string; kind: Kind };

export function throttleKeys(account: string, ip: string | null): Key[] {
  const keys: Key[] = [{ key: `account:${account.trim().toLowerCase()}`, kind: "account" }];
  if (ip) keys.push({ key: `ip:${ip}`, kind: "ip" });
  return keys;
}

/** Echte Client-IP hinter Traefik. */
export function clientIp(headers: Headers): string | null {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/** Minuten, die noch gewartet werden muss, oder 0. */
export function lockedMinutes(keys: { key: string }[], now = new Date()): number {
  const rows = db().select().from(loginThrottle).where(inArray(loginThrottle.key, keys.map((k) => k.key))).all();
  const until = Math.max(0, ...rows.map((r) => r.lockedUntil?.getTime() ?? 0));
  return until > now.getTime() ? Math.ceil((until - now.getTime()) / 60_000) : 0;
}

export function recordFailure(keys: Key[], now = new Date()) {
  for (const { key, kind } of keys) {
    const row = db().select().from(loginThrottle).where(eq(loginThrottle.key, key)).get();
    const fresh = !row || now.getTime() - row.updatedAt.getTime() > FORGET_MS;
    let failures = (fresh ? 0 : row.failures) + 1;
    let lockCount = fresh ? 0 : row.lockCount;
    let lockedUntil = fresh ? null : row.lockedUntil;
    if (failures >= LIMIT[kind]) {
      lockCount += 1;
      lockedUntil = new Date(now.getTime() + Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** (lockCount - 1)));
      failures = 0;
    }
    db()
      .insert(loginThrottle)
      .values({ key, failures, lockCount, lockedUntil, updatedAt: now })
      .onConflictDoUpdate({ target: loginThrottle.key, set: { failures, lockCount, lockedUntil, updatedAt: now } })
      .run();
  }
}

/** Nach erfolgreicher Anmeldung zählt das Konto wieder von vorn (die IP nicht). */
export function recordSuccess(keys: Key[]) {
  const accountKeys = keys.filter((k) => k.kind === "account").map((k) => k.key);
  if (accountKeys.length) db().delete(loginThrottle).where(inArray(loginThrottle.key, accountKeys)).run();
}
