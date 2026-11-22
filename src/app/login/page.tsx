"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: data.get("email"),
      password: data.get("password"),
      code: data.get("code") ?? "",
      redirect: false,
    });
    setLoading(false);

    const locked = result?.code?.match(/^locked-(\d+)$/);
    if (locked) {
      const minutes = Number(locked[1]);
      setError(`Zu viele Fehlversuche. Bitte in ${minutes === 1 ? "einer Minute" : `${minutes} Minuten`} erneut versuchen.`);
      return;
    }
    if (result?.code === "totp") return setNeedsCode(true);
    if (result?.code === "totp-invalid") return setError("Der Bestätigungscode stimmt nicht.");
    if (result?.error) {
      setNeedsCode(false);
      return setError("E-Mail oder Passwort ist falsch.");
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={64} height={64} className="mx-auto rounded-2xl" />
          <h1 className="mt-5 font-serif text-4xl font-semibold tracking-tight">DMS</h1>
          <p className="mt-1.5 text-muted">Predigten, Vorträge und Bibel</p>
        </div>
        <form onSubmit={handleSubmit} className="card mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="label">E-Mail</label>
            <input id="email" name="email" type="email" autoComplete="username" required className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">Passwort</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
          </div>
          {needsCode && (
            <div>
              <label htmlFor="code" className="label">Bestätigungscode</label>
              <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" autoFocus required placeholder="123456" className="input text-center text-lg tracking-[0.3em]" />
              <p className="mt-1.5 text-xs text-muted">6-stelliger Code aus deiner Authenticator-App – oder ein Notfall-Code.</p>
            </div>
          )}
          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Wird geprüft …" : needsCode ? "Bestätigen" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
