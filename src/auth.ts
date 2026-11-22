import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { clientIp, lockedMinutes, recordFailure, recordSuccess, throttleKeys } from "@/lib/login-throttle";
import { consumeRecoveryCode, verifyTotp } from "@/lib/totp";
import { authConfig } from "./auth.config";

// Gegen diesen Hash wird bei unbekannten Adressen geprüft: gleiche Antwortzeit,
// kein Hinweis, welche Konten es gibt.
const DUMMY_HASH = bcrypt.hashSync("kein-konto", 10);

class LoginError extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
        code: { label: "Bestätigungscode", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const ip = clientIp(request.headers);
        const keys = throttleKeys(email, ip);

        const wait = lockedMinutes(keys);
        if (wait > 0) {
          console.warn(`[login] gesperrt ip=${ip ?? "?"} konto=${email} noch ${wait} min`);
          throw new LoginError(`locked-${wait}`);
        }

        const user = db().select().from(users).where(eq(users.email, email)).get();
        const valid = await bcrypt.compare(String(credentials.password), user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) {
          console.warn(`[login] fehlgeschlagen ip=${ip ?? "?"} konto=${email}`);
          recordFailure(keys);
          return null;
        }

        if (user.totpEnabledAt && user.totpSecret) {
          const code = String(credentials.code ?? "").trim();
          if (!code) throw new LoginError("totp");

          const step = verifyTotp(user.totpSecret, code, user.totpLastStep);
          if (step !== null) {
            db().update(users).set({ totpLastStep: step }).where(eq(users.id, user.id)).run();
          } else {
            const rest = consumeRecoveryCode(JSON.parse(user.totpRecovery ?? "[]") as string[], code);
            if (!rest) {
              console.warn(`[login] 2FA-Code falsch ip=${ip ?? "?"} konto=${email}`);
              recordFailure(keys);
              throw new LoginError("totp-invalid");
            }
            db().update(users).set({ totpRecovery: JSON.stringify(rest) }).where(eq(users.id, user.id)).run();
            console.warn(`[login] Notfall-Code benutzt konto=${email}, noch ${rest.length}`);
          }
        }

        recordSuccess(keys);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
