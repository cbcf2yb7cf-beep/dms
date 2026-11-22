import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Zeitbasierte Einmal-Codes (TOTP, RFC 6238) wie in Google Authenticator,
// Microsoft Authenticator oder der iPhone-Passwörter-App: SHA-1, 6 Ziffern,
// 30 Sekunden. Bewusst ohne Bibliothek — das Verfahren ist kurz.

const PERIOD = 30;
const DIGITS = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(text: string): Buffer {
  const clean = text.replace(/[\s=-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Ungültiger Schlüssel");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return String(code).padStart(DIGITS, "0");
}

export function currentStep(now = Date.now()): number {
  return Math.floor(now / 1000 / PERIOD);
}

/**
 * Prüft einen Code und gibt den verwendeten Zeitschritt zurück (oder null).
 * Erlaubt ±1 Schritt Uhrabweichung; Codes bis einschließlich `lastStep`
 * sind verbraucht und gelten nicht noch einmal.
 */
export function verifyTotp(secret: string, code: string, lastStep: number | null, now = Date.now()): number | null {
  const digits = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(digits)) return null;
  const step = currentStep(now);
  for (const candidate of [step - 1, step, step + 1]) {
    if (lastStep !== null && candidate <= lastStep) continue;
    if (timingSafeEqual(Buffer.from(hotp(secret, candidate)), Buffer.from(digits))) return candidate;
  }
  return null;
}

export function otpauthUrl(secret: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}

// ── Notfall-Codes ──────────────────────────────────────────────────────────
// Einmal verwendbar, falls das Handy fehlt. Gespeichert wird nur ein Hash.

const RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(8);
    const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join("");
    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
  });
}

const normalizeRecovery = (code: string) => code.toLowerCase().replace(/[^a-z0-9]/g, "");

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeRecovery(code)).digest("hex");
}

/** Gibt die verbleibenden Hashes zurück, wenn der Code passt, sonst null. */
export function consumeRecoveryCode(hashes: string[], code: string): string[] | null {
  if (normalizeRecovery(code).length !== 8) return null;
  const hash = hashRecoveryCode(code);
  return hashes.includes(hash) ? hashes.filter((h) => h !== hash) : null;
}
