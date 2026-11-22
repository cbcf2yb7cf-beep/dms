import { bibleAvailable, extraNotices, translations } from "@/lib/bible/db";
import { requireUser } from "@/lib/session";
import { BibleTabs } from "@/components/bible/bible-tabs";

export const metadata = { title: "Quellen & Lizenzen" };

export default async function SourcesPage() {
  await requireUser();
  const list = bibleAvailable() ? translations() : [];
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-8 sm:px-10">
      <BibleTabs active="/bibel/quellen" />
      <h1 className="font-serif text-3xl font-semibold">Quellen & Lizenzen</h1>
      <p className="text-ink-2">Alle Texte liegen auf deinem Mac und funktionieren ohne Internet. Es werden nur Übersetzungen verwendet, die frei genutzt werden dürfen.</p>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {list.map((t) => (
          <li key={t.id} className="flex flex-col gap-1 px-5 py-4">
            <span className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold">{t.name} <span className="text-sm text-muted">({t.short}, {t.lang === "de" ? "Deutsch" : "Englisch"})</span></span>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs">{t.license}</span>
            </span>
            <span className="text-sm text-ink-2">{t.notice}</span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-2 text-sm text-ink-2">
        {(list.length ? extraNotices() : []).map((n) => <li key={n}>{n}</li>)}
      </ul>
      <p className="text-sm text-muted">Nicht enthalten sind urheberrechtlich geschützte Ausgaben wie Luther 2017, Elberfelder 2006, Schlachter 2000, Hoffnung für alle oder NGÜ.</p>
    </div>
  );
}
