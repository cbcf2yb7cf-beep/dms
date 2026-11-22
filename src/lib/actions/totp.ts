"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { generateRecoveryCodes, generateSecret, hashRecoveryCode, otpauthUrl, verifyTotp } from "@/lib/totp";

export type TotpState =
  | { phase: "setup"; qr: string; secret: string; error?: string }
  | { phase: "codes"; codes: string[]; message: string }
  | { phase?: undefined; error?: string; message?: string }
  | undefined;

const CLEARED = { totpSecret: null, totpPendingSecret: null, totpEnabledAt: null, totpLastStep: null, totpRecovery: null };

function newRecoveryCodes() {
  const codes = generateRecoveryCodes();
  return { codes, stored: JSON.stringify(codes.map(hashRecoveryCode)) };
}

async function setupState(secret: string, email: string, error?: string): Promise<TotpState> {
  const qr = await QRCode.toDataURL(otpauthUrl(secret, email, "DMS"), { margin: 1, width: 220 });
  return { phase: "setup", qr, secret: secret.replace(/(.{4})/g, "$1 ").trim(), error };
}

/** Einrichten, Bestätigen, neue Notfall-Codes, Ausschalten — Schritt steht im Feld "step". */
export async function totpAction(_prev: TotpState, formData: FormData): Promise<TotpState> {
  const user = await requireUser();
  const step = String(formData.get("step") ?? "");
  const code = String(formData.get("code") ?? "");
  const update = (data: Partial<typeof users.$inferInsert>) =>
    db().update(users).set(data).where(eq(users.id, user.id)).run();

  if (step === "start") {
    if (user.totpEnabledAt) return { error: "Die Zwei-Faktor-Anmeldung ist bereits aktiv." };
    const secret = generateSecret();
    update({ totpPendingSecret: secret });
    return setupState(secret, user.email);
  }

  if (step === "confirm") {
    if (!user.totpPendingSecret) return { error: "Bitte die Einrichtung neu starten." };
    const used = verifyTotp(user.totpPendingSecret, code, null);
    if (used === null) {
      return setupState(user.totpPendingSecret, user.email, "Der Code stimmt nicht. Uhrzeit am Handy prüfen und den aktuellen Code eingeben.");
    }
    const { codes, stored } = newRecoveryCodes();
    update({ totpSecret: user.totpPendingSecret, totpPendingSecret: null, totpEnabledAt: new Date(), totpLastStep: used, totpRecovery: stored });
    console.info(`[2fa] aktiviert konto=${user.email}`);
    revalidatePath("/", "layout");
    return { phase: "codes", codes, message: "Zwei-Faktor-Anmeldung ist aktiv." };
  }

  if (step === "cancel") {
    update({ totpPendingSecret: null });
    return undefined;
  }

  if (step === "regenerate") {
    if (!user.totpSecret) return { error: "Die Zwei-Faktor-Anmeldung ist nicht aktiv." };
    const used = verifyTotp(user.totpSecret, code, user.totpLastStep);
    if (used === null) return { error: "Der Code stimmt nicht." };
    const { codes, stored } = newRecoveryCodes();
    update({ totpRecovery: stored, totpLastStep: used });
    revalidatePath("/einstellungen");
    return { phase: "codes", codes, message: "Neue Notfall-Codes erstellt — die alten gelten nicht mehr." };
  }

  if (step === "disable") {
    if (!user.totpSecret) return { error: "Die Zwei-Faktor-Anmeldung ist nicht aktiv." };
    const valid = await bcrypt.compare(String(formData.get("password") ?? ""), user.passwordHash);
    if (!valid) return { error: "Das Passwort stimmt nicht." };
    update(CLEARED);
    console.info(`[2fa] ausgeschaltet konto=${user.email}`);
    revalidatePath("/", "layout");
    return { message: "Zwei-Faktor-Anmeldung ist ausgeschaltet." };
  }

  return { error: "Unbekannter Schritt." };
}
