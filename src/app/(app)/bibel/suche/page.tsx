import Link from "next/link";
import { Search } from "lucide-react";
import { bookByNumber } from "@/lib/bible/books";
import { splitId } from "@/lib/bible/refs";
import { bibleAvailable, concordance, DEFAULT_TRANSLATION, translations, validTranslations, verseLabel, type SearchMode } from "@/lib/bible/db";
import { requireUser } from "@/lib/session";
import { BibleTabs } from "@/components/bible/bible-tabs";
import { Hits } from "@/components/bible/hits";

export const metadata = { title: "Konkordanz" };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const PAGE = 100;
const MODES: [SearchMode, string][] = [
  ["wort", "Ganzes Wort"],
  ["anfang", "Wortanfang"],
  ["gruppe", "Wortgruppe"],
];

export default async function ConcordancePage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireUser();
  const p = await searchParams;
  const q = one(p.q) ?? "";
  const tr = validTranslations([one(p.tr) ?? DEFAULT_TRANSLATION], 1)[0];
  const mode = (MODES.find(([m]) => m === one(p.modus))?.[0] ?? "wort") as SearchMode;
  const book = Number(one(p.buch)) || undefined;
  const page = Math.max(1, Number(one(p.seite)) || 1);
  const result = bibleAvailable() && q ? concordance(q, tr, mode, { book, limit: PAGE, offset: (page - 1) * PAGE }) : null;
  const all = bibleAvailable() ? translations() : [];
  const link = (over: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams({ q, tr, modus: mode, ...(book ? { buch: String(book) } : {}) });
    for (const [k, v] of Object.entries(over)) v === undefined ? params.delete(k) : params.set(k, String(v));
    return `/bibel/suche?${params}`;
  };
  const max = Math.max(1, ...(result?.byBook.map((b) => b.n) ?? [1]));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-10">
      <BibleTabs active="/bibel/suche" />
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex-[2_1_260px]">
          <label htmlFor="cq" className="label">Wort oder Wortgruppe</label>
          <input id="cq" name="q" defaultValue={q} placeholder="z. B. Gnade, glaub, „Licht der Welt“" className="input" autoFocus={!q} />
        </div>
        <div>
          <label htmlFor="ctr" className="label">Übersetzung</label>
          <select id="ctr" name="tr" defaultValue={tr} className="input w-auto">
            {all.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="cm" className="label">Suche nach</label>
          <select id="cm" name="modus" defaultValue={mode} className="input w-auto">
            {MODES.map(([m, l]) => <option key={m} value={m}>{l}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary"><Search className="size-4" aria-hidden="true" /> Suchen</button>
      </form>
      <p className="text-sm text-muted">Groß-/Kleinschreibung und Umlaute spielen keine Rolle. „Wortanfang“ findet mit „glaub“ auch glauben, Glaube, gläubig.</p>

      {q && result && (
        <>
          <p aria-live="polite" className="text-ink-2">
            <strong className="text-ink">{result.total.toLocaleString("de-DE")}</strong> {result.total === 1 ? "Vers" : "Verse"} mit „{q}“
            {book ? <> in {bookByNumber(book).name} · <Link href={link({ buch: undefined, seite: undefined })}>alle Bücher</Link></> : null}
          </p>

          {result.byBook.length > 1 && (
            <details open={!book} className="rounded-2xl border border-border bg-surface p-4">
              <summary className="cursor-pointer text-sm font-semibold">Verteilung auf die Bücher ({result.byBook.length})</summary>
              <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {result.byBook.map((b) => (
                  <li key={b.book}>
                    <Link href={link({ buch: b.book, seite: undefined })} className={`flex items-center gap-2 text-sm no-underline ${book === b.book ? "font-semibold" : "text-ink-2"}`}>
                      <span className="w-36 shrink-0 truncate">{bookByNumber(b.book).name}</span>
                      <span className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(4, (b.n / max) * 100)}px` }} aria-hidden="true" />
                      <span className="text-muted">{b.n}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {result.results.map((r) => {
              const s = splitId(r.id);
              return (
                <li key={r.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-4">
                  <Link href={`/bibel?b=${s.book}&c=${s.chapter}&v=${s.verse}&tr=${tr}#v${s.verse}`} className="w-40 shrink-0 text-sm font-semibold">{verseLabel(r.id)}</Link>
                  <p className="font-serif text-[17px] leading-relaxed"><Hits text={r.text} /></p>
                </li>
              );
            })}
            {result.results.length === 0 && <li className="px-5 py-6 text-muted">Keine Treffer. Versuch „Wortanfang“ oder eine andere Übersetzung.</li>}
          </ol>

          {result.total > PAGE && (
            <nav aria-label="Seiten" className="flex items-center justify-between">
              {page > 1 ? <Link href={link({ seite: page - 1 })}>← Vorherige</Link> : <span />}
              <span className="text-sm text-muted">Seite {page} von {Math.ceil(result.total / PAGE)}</span>
              {page * PAGE < result.total ? <Link href={link({ seite: page + 1 })}>Nächste →</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
