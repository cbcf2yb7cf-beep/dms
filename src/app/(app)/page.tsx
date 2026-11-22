import Link from "next/link";
import { ArrowRight, BookOpen, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { NAV } from "@/lib/nav";
import { NavIcon } from "@/components/nav-icon";
import { PageHeader } from "@/components/page-header";
import { DashboardSearch } from "@/components/dashboard-search";
import { DocumentList } from "@/components/document-list";
import { NewDocumentMenu } from "@/components/new-document-menu";
import { listDocuments, stats, topicCounts } from "@/lib/documents";
import { requireUser } from "@/lib/session";
import { verseOfDay } from "@/lib/verses";
import { isLocal } from "@/lib/local";

export const metadata = { title: "Dashboard" };

// Noch nicht gebaute Bereiche laut Plan (docs/PLAN.md).
const MODULES: Record<string, { phase?: number; text: string }> = {
  "/archiv": { text: "Predigten und Vorträge schreiben, ordnen und wiederfinden" },
  "/bibel": { text: "8 freie Übersetzungen parallel, Konkordanz, Grundtext mit Strong, Querverweise" },
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
  const local = isLocal();

  const s = stats();
  const recent = listDocuments({ limit: 5 }).items;
  const favorites = listDocuments({ favorite: true, limit: 5 }).items;
  const themes = topicCounts(16);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader eyebrow={today} title={`${greeting(hour)}, ${firstName}`}>
        <Link href="/archiv/import" className="btn-secondary">
          <Upload className="size-4" aria-hidden="true" /> Importieren
        </Link>
        <NewDocumentMenu />
      </PageHeader>

      <DashboardSearch />

      {!local && !user.totpEnabledAt && (
        <Link href="/einstellungen#zwei-faktor" className="flex items-center gap-4 rounded-2xl border border-border-strong bg-accent-soft px-5 py-4 text-ink hover:border-accent">
          <ShieldAlert className="size-6 shrink-0 text-accent" aria-hidden="true" />
          <span className="flex-1">
            <span className="font-semibold">Zwei-Faktor-Anmeldung einrichten.</span>{" "}
            <span className="text-ink-2">Deine Predigten sind privat – mit einem Code vom Handy kommt niemand nur mit dem Passwort hinein.</span>
          </span>
          <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
        </Link>
      )}

      {s.total > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Überblick">
          <Stat label="Dokumente" value={s.total} href="/archiv" />
          {(["predigt", "vortrag"] as const).map((t) => (
            <Stat key={t} label={t === "predigt" ? "Predigten" : "Vorträge"} value={s.byType.find((b) => b.type === t)?.n ?? 0} href={`/archiv?art=${t}`} />
          ))}
          <Stat label="Wörter geschrieben" value={s.words} />
        </ul>
      )}

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Zuletzt bearbeitet</h2>
            {recent.length > 0 && <Link href="/archiv" className="text-sm">Alle anzeigen</Link>}
          </div>
          {recent.length > 0 ? (
            <DocumentList items={recent} />
          ) : (
            <div className="card flex flex-1 flex-col items-start justify-center gap-3 py-10">
              <p className="font-serif text-2xl font-semibold">Noch keine Dokumente</p>
              <p className="max-w-lg text-ink-2">Leg deine erste Predigt an – oder übernimm deinen vorhandenen Ordner mit Word-, PowerPoint- und PDF-Dateien über „Importieren“.</p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <h2 className="eyebrow">Wo habe ich darüber gepredigt?</h2>
            <form action="/archiv" method="get" className="card flex flex-col gap-3 p-5">
              <label htmlFor="dash-stelle" className="label mb-0">Bibelstelle</label>
              <div className="flex gap-2">
                <input id="dash-stelle" name="stelle" placeholder="z. B. Röm 8 oder Joh 3,16" className="input" required />
                <button type="submit" className="btn-primary px-3" aria-label="Suchen">
                  <BookOpen className="size-4" aria-hidden="true" />
                </button>
              </div>
              <p className="text-xs text-muted">Findet alle Dokumente, deren Haupttext oder Text die Stelle berührt.</p>
            </form>
          </section>
          <figure className="flex flex-col justify-between gap-6 rounded-2xl bg-ink p-7 text-bg">
            <figcaption className="text-xs font-semibold tracking-[0.08em] uppercase opacity-80">Wort für heute</figcaption>
            <blockquote className="font-serif text-xl leading-relaxed">„{verse.text}“</blockquote>
            <span className="text-sm opacity-80">{verse.ref} · Luther 1912</span>
          </figure>
        </div>
      </section>

      {favorites.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="eyebrow">Favoriten</h2>
          <DocumentList items={favorites} />
        </section>
      )}

      {themes.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="eyebrow">Themen</h2>
          <ul className="flex flex-wrap gap-2.5">
            {themes.map((t) => (
              <li key={t.name}>
                <Link href={`/archiv?thema=${encodeURIComponent(t.name)}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-[15px] text-ink hover:border-border-strong">
                  {t.name} <span className="text-sm text-muted">{t.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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
                    {mod?.phase ? (
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">Phase {mod.phase}</span>
                    ) : (
                      <span className="rounded-full border border-ok px-2.5 py-0.5 text-xs text-ok">Bereit</span>
                    )}
                  </span>
                  {mod && <span className="text-[15px] text-ink-2">{mod.text}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {!local && user.totpEnabledAt && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <ShieldCheck className="size-4 text-ok" aria-hidden="true" /> Zwei-Faktor-Anmeldung aktiv
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <>
      <span className="font-serif text-3xl font-semibold">{value.toLocaleString("de-DE")}</span>
      <span className="text-sm text-muted">{label}</span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="card flex h-full flex-col gap-1 p-5 text-ink hover:border-border-strong">{body}</Link>
      ) : (
        <div className="card flex h-full flex-col gap-1 p-5">{body}</div>
      )}
    </li>
  );
}
