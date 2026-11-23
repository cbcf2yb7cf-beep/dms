import { PageHeader } from "@/components/page-header";
import { PasswordForm } from "@/components/password-form";
import { TotpSection } from "@/components/totp-section";
import { requireUser } from "@/lib/session";
import { isLocal, localDataDir } from "@/lib/local";
import { aiConfigured } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";
import { currentModel } from "@/lib/ai/tasks";
import { setModelAction } from "@/lib/actions/ai";
import { ApiKeyForm } from "@/components/ai/api-key-form";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const user = await requireUser();
  const enabledSince = user.totpEnabledAt
    ? new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" }).format(user.totpEnabledAt)
    : null;
  const recoveryLeft = user.totpRecovery ? (JSON.parse(user.totpRecovery) as string[]).length : 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-10 sm:px-10">
      <PageHeader title="Einstellungen" />

      {isLocal() ? (
        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Mac-App</h2>
          <p className="text-[15px] text-ink-2">
            DMS läuft komplett auf diesem Mac, ohne Internet und ohne Anmeldung. Deine Dokumente liegen hier:
          </p>
          <p className="rounded-lg bg-surface-2 px-3 py-2 font-mono text-sm break-all">{localDataDir()}</p>
          <p className="text-[15px] text-ink-2">
            Im Menü <strong>DMS → Datenordner im Finder zeigen</strong> öffnest du ihn. Time Machine sichert ihn automatisch mit. Für eine
            zusätzliche Sicherung kopierst du den Ordner bei geschlossener App z. B. nach iCloud Drive oder OneDrive.
          </p>
        </section>
      ) : (
        <ServerSettings user={user} enabledSince={enabledSince} recoveryLeft={recoveryLeft} />
      )}

      <section id="assistent" className="card flex scroll-mt-6 flex-col gap-4">
        <h2 className="text-lg font-semibold">Assistent (Claude)</h2>
        <ApiKeyForm configured={aiConfigured()} />
        <form action={setModelAction} className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="ai-model" className="label">Modell</label>
            <select id="ai-model" name="model" defaultValue={currentModel()} className="input w-auto">
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.name} – {m.note} ({m.input} $ / {m.output} $ je Mio. Tokens)</option>)}
            </select>
          </div>
          <SubmitButton className="btn-secondary">Speichern</SubmitButton>
        </form>
        <p className="text-sm text-ink-2">Der Assistent braucht Internet. Vor jedem Aufruf siehst du, was gesendet wird. Lehnt Claude eine Anfrage aus Sicherheitsgründen ab, wird sie automatisch mit einem passenden anderen Modell wiederholt (nicht bei Haiku).</p>
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Darstellung</h2>
        <p className="text-[15px] text-ink-2">Hell oder dunkel schaltest du unten in der Seitenleiste um. Die Seitenleiste klappst du mit dem Knopf neben dem Logo ein und aus – beides wird gespeichert.</p>
      </section>
    </div>
  );
}

function ServerSettings({ user, enabledSince, recoveryLeft }: { user: Awaited<ReturnType<typeof requireUser>>; enabledSince: string | null; recoveryLeft: number }) {
  return (
    <>
      <section className="card flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Konto</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[15px]">
          <dt className="text-muted">Name</dt>
          <dd>{user.name}</dd>
          <dt className="text-muted">E-Mail</dt>
          <dd className="break-all">{user.email}</dd>
        </dl>
      </section>

      <section id="zwei-faktor" className="card flex scroll-mt-6 flex-col gap-4">
        <h2 className="text-lg font-semibold">Zwei-Faktor-Anmeldung</h2>
        <TotpSection enabled={!!user.totpEnabledAt} enabledSince={enabledSince} recoveryLeft={recoveryLeft} />
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Passwort ändern</h2>
        <PasswordForm />
      </section>

    </>
  );
}
