import Link from "next/link";
import { ArrowRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { NAV } from "@/lib/nav";
import { NavIcon } from "@/components/nav-icon";
import { PageHeader } from "@/components/page-header";
import { DashboardSearch } from "@/components/dashboard-search";
import { requireUser } from "@/lib/session";
import { verseOfDay } from "@/lib/verses";

export const metadata = { title: "Dashboard" };

// Stand der Module laut Plan (docs/PLAN.md). Wird mit jeder Phase aktualisiert.
const MODULES: Record<string, { phase: number; text: string }> = {
  "/archiv": { phase: 2, text: "Predigten und Vorträge schreiben, ordnen und importieren" },
  "/bibel": { phase: 4, text: "Freie Übersetzungen parallel, Konkordanz und Grundtext" },
  "/themen": { phase: 5, text: "Alle Predigten und Bibelstellen zu einem Thema" },
  "/praesentationen": { phase: 6, text: "Folien aus der Gliederung, Referentenansicht am Beamer" },
  "/assistent": { phase: 7, text: "Claude hilft bei Gliederung, Recherche und Folien" },
};

function greeting(hour: number) {
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  // formatToParts: "de-DE" formatiert die Stunde sonst als "13 Uhr".
  const hour = Number(
    new Intl.DateTimeFormat("de-DE", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Berlin" })
      .formatToParts(now)
      .find((p) => p.type === "hour")?.value ?? 12,
  );
  const today = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" }).format(now);
  const verse = verseOfDay(now);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader eyebrow={today} title={`${greeting(hour)}, ${firstName}`} />

      <DashboardSearch />

      {!user.totpEnabledAt && (
        <Link href="/einstellungen#zwei-faktor" className="flex items-center gap-4 rounded-2xl border border-border-strong bg-accent-soft px-5 py-4 text-ink hover:border-accent">
          <ShieldAlert className="size-6 shrink-0 text-accent" aria-hidden="true" />
          <span className="flex-1">
            <span className="font-semibold">Zwei-Faktor-Anmeldung einrichten.</span>{" "}
            <span className="text-ink-2">Deine Predigten sind privat – mit einem Code vom Handy kommt niemand nur mit dem Passwort hinein.</span>
          </span>
          <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
        </Link>
      )}

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="eyebrow">Zuletzt bearbeitet</h2>
          <div className="card flex flex-1 flex-col items-start justify-center gap-3 py-10">
            <p className="font-serif text-2xl font-semibold">Noch keine Dokumente</p>
            <p className="max-w-lg text-ink-2">
              Sobald das Archiv steht, erscheinen hier deine zuletzt bearbeiteten Predigten und Vorträge – mit Bibelstellen und Themen auf einen Blick.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="eyebrow">Wort für heute</h2>
          <figure className="flex flex-1 flex-col justify-between gap-6 rounded-2xl bg-ink p-7 text-bg">
            <blockquote className="font-serif text-xl leading-relaxed">„{verse.text}“</blockquote>
            <figcaption className="text-sm opacity-80">{verse.ref} · Luther 1912</figcaption>
          </figure>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="eyebrow">Bereiche</h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {NAV.filter((n) => n.href !== "/").map((item) => {
            const mod = MODULES[item.href];
            return (
              <li key={item.href}>
                <Link href={item.href} className="card flex h-full flex-col gap-3 p-5 transition-colors hover:border-border-strong">
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                        <NavIcon name={item.icon} className="size-5" />
                      </span>
                      <span className="text-lg font-semibold">{item.label}</span>
                    </span>
                    {mod && <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">Phase {mod.phase}</span>}
                  </span>
                  {mod && <span className="text-[15px] text-ink-2">{mod.text}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {user.totpEnabledAt && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <ShieldCheck className="size-4 text-ok" aria-hidden="true" /> Zwei-Faktor-Anmeldung aktiv
        </p>
      )}
    </div>
  );
}
