"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { totpAction } from "@/lib/actions/totp";
import { FormMessage, SubmitButton } from "@/components/submit-button";

/** Zwei-Faktor-Anmeldung einrichten, Notfall-Codes erneuern, ausschalten. */
export function TotpSection({
  enabled,
  enabledSince,
  recoveryLeft,
}: {
  enabled: boolean;
  enabledSince: string | null;
  recoveryLeft: number;
}) {
  const [state, formAction] = useActionState(totpAction, undefined);

  if (state?.phase === "codes") return <RecoveryCodes codes={state.codes} message={state.message} />;

  if (state?.phase === "setup") {
    return (
      <div className="space-y-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Authenticator-App öffnen (z.B. iPhone-Passwörter-App, Google oder Microsoft Authenticator).</li>
          <li>Diesen QR-Code scannen — oder den Schlüssel von Hand eingeben.</li>
          <li>Den angezeigten 6-stelligen Code hier bestätigen.</li>
        </ol>
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qr} alt="QR-Code für die Authenticator-App" width={180} height={180} className="rounded-xl border border-border bg-white p-2" />
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted">Schlüssel zum Abtippen</p>
            <p className="font-mono text-sm break-all">{state.secret}</p>
          </div>
        </div>
        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="step" value="confirm" />
          <div>
            <label htmlFor="totp-code" className="label">Code aus der App</label>
            <input id="totp-code" name="code" inputMode="numeric" autoComplete="one-time-code" required placeholder="123456" className="input w-40 text-center tracking-[0.3em]" />
          </div>
          <SubmitButton>Bestätigen</SubmitButton>
        </form>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <form action={formAction}>
          <input type="hidden" name="step" value="cancel" />
          <SubmitButton className="text-xs text-muted hover:text-danger">Abbrechen</SubmitButton>
        </form>
      </div>
    );
  }

  if (!enabled) {
    return (
      <form action={formAction} className="space-y-3">
        <p className="text-sm text-muted">
          Zusätzlich zum Passwort wird bei der Anmeldung ein Code aus einer App auf deinem Handy abgefragt. Wer nur
          dein Passwort kennt, kommt so nicht hinein. Auf Geräten, auf denen du schon angemeldet bist, ändert sich nichts.
        </p>
        <input type="hidden" name="step" value="start" />
        <FormMessage state={state} />
        <SubmitButton>Einrichten</SubmitButton>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        <span className="font-semibold text-accent">Aktiv</span>
        {enabledSince && <span className="text-muted"> seit {enabledSince}</span>}
        <span className="text-muted"> · {recoveryLeft} Notfall-Codes übrig</span>
      </p>
      {recoveryLeft <= 3 && (
        <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-ink">Nur noch wenige Notfall-Codes — bitte neue erstellen.</p>
      )}
      <FormMessage state={state} />
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-accent">Neue Notfall-Codes erstellen</summary>
        <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="step" value="regenerate" />
          <div>
            <label htmlFor="totp-regen" className="label">Aktueller Code aus der App</label>
            <input id="totp-regen" name="code" inputMode="numeric" autoComplete="one-time-code" required className="input w-40 text-center tracking-[0.3em]" />
          </div>
          <SubmitButton className="btn-secondary">Erstellen</SubmitButton>
        </form>
      </details>
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-danger">Ausschalten</summary>
        <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="step" value="disable" />
          <div>
            <label htmlFor="totp-off" className="label">Passwort zur Bestätigung</label>
            <input id="totp-off" name="password" type="password" autoComplete="current-password" required className="input" />
          </div>
          <SubmitButton className="btn-danger" confirm="Zwei-Faktor-Anmeldung wirklich ausschalten?">Ausschalten</SubmitButton>
        </form>
      </details>
    </div>
  );
}

function RecoveryCodes({ codes, message }: { codes: string[]; message: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3">
      <p className="font-semibold text-accent">{message}</p>
      <p className="text-sm">
        <strong>Notfall-Codes jetzt sichern</strong> (Passwort-Manager oder ausdrucken). Jeder funktioniert einmal
        anstelle des App-Codes, falls das Handy weg ist. Sie werden nur jetzt angezeigt.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-3 font-mono text-sm sm:grid-cols-5">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <button
        type="button"
        className="btn-secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(`DMS – Notfall-Codes\n${codes.join("\n")}`);
          setCopied(true);
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Kopiert" : "Kopieren"}
      </button>
    </div>
  );
}
