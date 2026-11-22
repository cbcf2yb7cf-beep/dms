import Link from "next/link";
import { notFound } from "next/navigation";
import { bookByNumber } from "@/lib/bible/books";
import { splitId } from "@/lib/bible/refs";
import { bibleAvailable, DEFAULT_TRANSLATION, lexicon, normalizeStrong, strongOccurrences, validTranslations, verseLabel, versesInRange } from "@/lib/bible/db";
import { requireUser } from "@/lib/session";
import { BibleTabs } from "@/components/bible/bible-tabs";

export async function generateMetadata({ params }: { params: Promise<{ nr: string }> }) {
  return { title: `Strong ${normalizeStrong((await params).nr)}` };
}

const PAGE = 200;

export default async function StrongPage({ params, searchParams }: { params: Promise<{ nr: string }>; searchParams: Promise<{ tr?: string; seite?: string; buch?: string }> }) {
  await requireUser();
  if (!bibleAvailable()) notFound();
  const key = decodeURIComponent((await params).nr);
  const strong = normalizeStrong(key);
  const entry = lexicon(key);
  if (!strong || !entry) notFound();
  const sp = await searchParams;
  const tr = validTranslations([sp.tr ?? DEFAULT_TRANSLATION], 1)[0];
  const page = Math.max(1, Number(sp.seite) || 1);
  const occ = strongOccurrences(strong, PAGE, (page - 1) * PAGE);
  const greek = strong.startsWith("G");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-8 sm:px-10">
      <BibleTabs active="/bibel" />
      <header className="flex flex-col gap-2">
        <span className="text-sm text-muted">{greek ? "Griechisch" : "Hebräisch/Aramäisch"} · Strong {strong} · {entry.morph}</span>
        <h1 className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span lang={greek ? "grc" : "he"} className="font-serif text-5xl">{entry.lemma}</span>
          <span className="text-xl text-ink-2 italic">{entry.translit}</span>
        </h1>
        <p className="text-lg">Grundbedeutung: <strong>{entry.gloss}</strong></p>
      </header>

      <section className="card flex flex-col gap-2">
        <h2 className="eyebrow">Lexikon (englisch, STEPBible)</h2>
        <p className="max-h-96 overflow-y-auto font-serif text-[16px] leading-relaxed whitespace-pre-line text-ink-2">{entry.definition}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">
          {occ.total.toLocaleString("de-DE")} Vorkommen in {occ.verses.toLocaleString("de-DE")} Versen
        </h2>
        <ul className="flex flex-wrap gap-2">
          {occ.byBook.map((b) => (
            <li key={b.book} className="rounded-full border border-border bg-surface px-3 py-1 text-sm">
              {bookByNumber(b.book).abbr} <span className="text-muted">{b.n}</span>
            </li>
          ))}
        </ul>
        <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {occ.rows.map((r) => {
            const s = splitId(r.verse);
            const text = versesInRange(tr, r.verse, r.verse)[0]?.text ?? "";
            return (
              <li key={r.verse} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-4">
                <span className="flex w-44 shrink-0 flex-col">
                  <Link href={`/bibel?b=${s.book}&c=${s.chapter}&v=${s.verse}#v${s.verse}`} className="text-sm font-semibold">{verseLabel(r.verse)}</Link>
                  <span lang={greek ? "grc" : "he"} className="font-serif text-ink-2">{r.forms}</span>
                </span>
                <p className="font-serif text-[16px] leading-relaxed">{text}</p>
              </li>
            );
          })}
        </ol>
        {occ.verses > PAGE && (
          <nav aria-label="Seiten" className="flex items-center justify-between">
            {page > 1 ? <Link href={`?seite=${page - 1}&tr=${tr}`}>← Vorherige</Link> : <span />}
            <span className="text-sm text-muted">Seite {page} von {Math.ceil(occ.verses / PAGE)}</span>
            {page * PAGE < occ.verses ? <Link href={`?seite=${page + 1}&tr=${tr}`}>Nächste →</Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
