import { PageHeader } from "@/components/page-header";
import { PasswordForm } from "@/components/password-form";
import { TotpSection } from "@/components/totp-section";
import { requireUser } from "@/lib/session";

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

      <section className="card flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Darstellung</h2>
        <p className="text-[15px] text-ink-2">Hell oder dunkel schaltest du unten in der Seitenleiste um. Die Seitenleiste klappst du mit dem Knopf neben dem Logo ein und aus – beides merkt sich das Gerät.</p>
      </section>
    </div>
  );
}
