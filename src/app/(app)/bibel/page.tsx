import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, NotebookPen, Search } from "lucide-react";
import { BOOKS, bookByNumber } from "@/lib/bible/books";
import { formatRef, parseRef, splitId, verseId } from "@/lib/bible/refs";
import { bibleAvailable, chapter as loadChapter, crossrefs, extraNotices, textForRef, translations, validTranslations, verseLabel, words } from "@/lib/bible/db";
import { isBookmarked, marksInRange, noteFor } from "@/lib/bible/notes";
import { listDocuments } from "@/lib/documents";
import { toggleBookmark } from "@/lib/actions/bible";
import { TYPE_LABELS } from "@/lib/doc-meta";
import { requireUser } from "@/lib/session";
import { BibleTabs } from "@/components/bible/bible-tabs";
import { ReaderControls } from "@/components/bible/reader-controls";
import { CopyButton } from "@/components/bible/copy-button";
import { VerseNoteForm } from "@/components/bible/verse-note-form";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Bibel" };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function BiblePage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireUser();
  if (!bibleAvailable()) return <MissingData />;

  const p = await searchParams;
  const saved = (await cookies()).get("dms-bibel")?.value.split(":") ?? [];
  const trs = validTranslations((one(p.tr) ?? saved[2] ?? "").split(","));

  // "Stelle eingeben" → zur Stelle springen
  const stelle = one(p.stelle);
  if (stelle) {
    const ref = parseRef(stelle);
    if (ref) {
      const s = splitId(ref.start);
      redirect(`/bibel?b=${s.book}&c=${s.chapter}&tr=${trs.join(",")}${s.verse > 1 || ref.end - ref.start < 999 ? `&v=${s.verse}#v${s.verse}` : ""}`);
    }
  }

  const book = Math.min(66, Math.max(1, Number(one(p.b) ?? saved[0]) || 43));
  const meta = bookByNumber(book);
  const ch = Math.min(meta.chapters, Math.max(1, Number(one(p.c) ?? (one(p.b) ? 1 : saved[1])) || 1));
  const selectedVerse = Number(one(p.v)) || null;

  const rows = loadChapter(trs, book, ch);
  const all = translations();
  const shown = all.filter((t) => trs.includes(t.id));
  const marks = marksInRange(verseId(book, ch, 0), verseId(book, ch, 999));
  const base = (b: number, c: number) => `/bibel?b=${b}&c=${c}&tr=${trs.join(",")}`;
  const prev = ch > 1 ? base(book, ch - 1) : book > 1 ? base(book - 1, bookByNumber(book - 1).chapters) : null;
  const next = ch < meta.chapters ? base(book, ch + 1) : book < 66 ? base(book + 1, 1) : null;
  const chapterLabel = `${meta.name} ${ch}`;
  const chapterDocs = listDocuments({ stelle: `${meta.abbr} ${ch}`, limit: 8 }).items;
  const unusualVersification = shown.some((t) => t.id === "elberfelder-bk" || t.id === "textbibel1906") && shown.length > 1;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-10">
      <BibleTabs active="/bibel" />

      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <ReaderControls books={BOOKS.map((b) => ({ n: b.n, name: b.name, chapters: b.chapters }))} book={book} chapter={ch} translations={all} selected={trs} />
        <form action="/bibel" method="get" className="flex items-end gap-2">
          <input type="hidden" name="tr" value={trs.join(",")} />
          <div>
            <label htmlFor="stelle" className="label">Stelle</label>
            <input id="stelle" name="stelle" placeholder="z. B. Röm 8,28" className="input w-44" />
          </div>
          <button type="submit" className="btn-primary px-3" aria-label="Zur Stelle">
            <Search className="size-4" aria-hidden="true" />
          </button>
        </form>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="flex min-w-0 flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            {prev ? <NavLink href={prev} label="Vorheriges Kapitel"><ChevronLeft className="size-5" aria-hidden="true" /></NavLink> : <span />}
            <h1 className="text-center font-serif text-3xl font-semibold sm:text-4xl">{chapterLabel}</h1>
            {next ? <NavLink href={next} label="Nächstes Kapitel"><ChevronRight className="size-5" aria-hidden="true" /></NavLink> : <span />}
          </div>

          {shown.length === 1 ? (
            <p className="font-serif text-[19px] leading-[1.85]">
              {rows.map((r) => (
                <span key={r.id} id={`v${r.verse}`} className={`scroll-mt-24 rounded ${selectedVerse === r.verse ? "bg-accent-soft" : ""}`}>
                  <VerseNumber href={`${base(book, ch)}&v=${r.verse}#v${r.verse}`} n={r.verse} marked={marks.marked.has(r.id)} noted={marks.noted.has(r.id)} />
                  {r.texts[shown[0].id] ?? ""}{" "}
                </span>
              ))}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-x-4 border-spacing-y-0 font-serif text-[17px] leading-relaxed">
                <thead>
                  <tr>
                    <th className="w-8" />
                    {shown.map((t) => (
                      <th key={t.id} scope="col" className="pb-3 text-left font-sans text-xs font-semibold tracking-[0.08em] text-accent uppercase">{t.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} id={`v${r.verse}`} className={`scroll-mt-24 align-top ${selectedVerse === r.verse ? "bg-accent-soft" : ""}`}>
                      <td className="py-1.5 text-right">
                        <VerseNumber href={`${base(book, ch)}&v=${r.verse}#v${r.verse}`} n={r.verse} marked={marks.marked.has(r.id)} noted={marks.noted.has(r.id)} />
                      </td>
                      {shown.map((t) => (
                        <td key={t.id} className="min-w-56 py-1.5">{r.texts[t.id] ?? <span className="text-muted">–</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {unusualVersification && (
            <p className="text-sm text-muted">Hinweis: Die Elberfelder (bibelkommentare.de) und die Textbibel zählen an einigen Stellen nach hebräischer Verszählung – dort können Verse in der Parallelansicht verschoben sein.</p>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4 print:hidden">
            {prev ? <Link href={prev} className="inline-flex min-h-11 items-center gap-1 text-sm"><ChevronLeft className="size-4" aria-hidden="true" /> Zurück</Link> : <span />}
            {next ? <Link href={next} className="inline-flex min-h-11 items-center gap-1 text-sm">Weiter <ChevronRight className="size-4" aria-hidden="true" /></Link> : <span />}
          </div>

          <section className="flex flex-col gap-3 print:hidden">
            <h2 className="eyebrow">Deine Dokumente zu {chapterLabel}</h2>
            {chapterDocs.length === 0 ? (
              <p className="text-sm text-muted">Noch keine – wenn Dokumente dieses Kapitel als Haupttext haben oder im Text erwähnen, erscheinen sie hier.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {chapterDocs.map((d) => (
                  <li key={d.id}>
                    <Link href={`/archiv/${d.id}`} className="font-medium">{d.title || "Ohne Titel"}</Link>
                    <span className="text-sm text-muted"> · {TYPE_LABELS[d.type]}{d.heldOn ? ` · ${d.heldOn.slice(0, 4)}` : ""}{d.mainRef ? ` · ${d.mainRef}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <footer className="flex flex-col gap-1 border-t border-border pt-4 text-xs text-muted">
            {shown.map((t) => <p key={t.id}>{t.notice}</p>)}
            {extraNotices().map((n) => <p key={n}>{n}</p>)}
          </footer>
        </article>

        {selectedVerse && <VersePanel book={book} chapter={ch} verse={selectedVerse} trs={trs} names={Object.fromEntries(all.map((t) => [t.id, t.name]))} texts={rows.find((r) => r.verse === selectedVerse)?.texts ?? {}} closeHref={`${base(book, ch)}#v${selectedVerse}`} />}
      </div>
    </div>
  );
}

function NavLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-label={label} title={label} className="inline-flex size-11 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink print:hidden">
      {children}
    </Link>
  );
}

function VerseNumber({ href, n, marked, noted }: { href: string; n: number; marked: boolean; noted: boolean }) {
  return (
    <Link href={href} scroll={false} className="mr-1 inline-flex items-baseline gap-0.5 align-super font-sans text-xs font-semibold text-accent no-underline hover:underline" aria-label={`Vers ${n} öffnen`}>
      {n}
      {marked && <Bookmark className="size-2.5 fill-accent" aria-label="Lesezeichen" />}
      {noted && <NotebookPen className="size-2.5" aria-label="Notiz" />}
    </Link>
  );
}

function VersePanel({ book, chapter, verse, trs, names, texts, closeHref }: { book: number; chapter: number; verse: number; trs: string[]; names: Record<string, string>; texts: Record<string, string>; closeHref: string }) {
  const id = verseId(book, chapter, verse);
  const label = verseLabel(id);
  const short = formatRef({ start: id, end: id });
  const original = words(id);
  const main = original.filter((w) => !w.variant);
  const variants = original.filter((w) => w.variant);
  const hebrew = main[0]?.lang === "hbo";
  const refs = crossrefs(id, 12);
  const docs = listDocuments({ stelle: short, limit: 8 }).items;
  const marked = isBookmarked(id);
  const first = trs[0];
  const copyText = `${texts[first] ?? ""}\n(${label}, ${names[first]})`;

  return (
    <aside aria-label={`Vers ${label}`} className="flex flex-col gap-6 self-start rounded-2xl border border-border bg-surface p-5 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto print:hidden">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold">{label}</h2>
        <Link href={closeHref} scroll={false} className="inline-flex min-h-10 items-center text-sm text-muted hover:text-ink">Schließen</Link>
      </div>

      <div className="flex flex-col gap-3">
        {trs.map((t) => (
          <div key={t}>
            <p className="text-xs font-semibold tracking-[0.08em] text-accent uppercase">{names[t]}</p>
            <p className="font-serif text-[17px] leading-relaxed">{texts[t] ?? "–"}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <CopyButton text={copyText} label="Vers kopieren" />
        <form action={toggleBookmark}>
          <input type="hidden" name="verse" value={id} />
          <input type="hidden" name="on" value={marked ? "0" : "1"} />
          <SubmitButton className="btn-secondary min-h-10 px-3 text-sm">
            {marked ? <BookmarkCheck className="size-4 text-accent" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
            {marked ? "Gemerkt" : "Merken"}
          </SubmitButton>
        </form>
      </div>

      <VerseNoteForm key={id} verse={id} initial={noteFor(id)} />

      {main.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="eyebrow">Grundtext ({hebrew ? "Hebräisch" : "Griechisch"})</h3>
          <ul dir={hebrew ? "rtl" : "ltr"} className="flex flex-wrap gap-1.5">
            {main.map((w) => (
              <li key={`${w.pos}-${w.strong}`} className="flex min-w-16 flex-col items-center rounded-lg border border-border bg-bg px-2 py-1.5 text-center">
                <span lang={hebrew ? "he" : "grc"} className="font-serif text-xl leading-tight">{w.surface}</span>
                <span dir="ltr" className="text-xs text-muted italic">{w.translit}</span>
                <span dir="ltr" className="max-w-32 text-xs leading-snug text-ink-2">{w.gloss}</span>
                {w.strong && (
                  <Link dir="ltr" href={`/bibel/strong/${w.estrong || w.strong}`} className="text-xs font-semibold" title={`${w.lemma} · ${w.grammar}`}>
                    {w.strong}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {variants.length > 0 && (
            <details className="text-sm text-muted">
              <summary className="cursor-pointer">Abweichende Lesarten ({variants.length})</summary>
              <p className="mt-1" dir={hebrew ? "rtl" : "ltr"}>{variants.map((w) => w.surface).join(" ")}</p>
            </details>
          )}
          <p className="text-xs text-muted">Bedeutungen auf Englisch (STEPBible). Klick auf die Nummer zeigt Lexikon und alle Vorkommen.</p>
        </section>
      )}

      {refs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="eyebrow">Querverweise</h3>
          <ul className="flex flex-col gap-2">
            {refs.map((r) => {
              const s = splitId(r.start);
              const preview = textForRef(first, r);
              return (
                <li key={`${r.start}-${r.end}`} className="text-sm">
                  <Link href={`/bibel?b=${s.book}&c=${s.chapter}&v=${s.verse}&tr=${trs.join(",")}#v${s.verse}`} className="font-semibold">{r.label}</Link>
                  <span className="text-ink-2"> {preview.length > 140 ? `${preview.slice(0, 140)} …` : preview}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="eyebrow">Wo habe ich darüber gepredigt?</h3>
        {docs.length === 0 ? (
          <p className="text-sm text-muted">Kein Dokument erwähnt {short}.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {docs.map((d) => (
              <li key={d.id}>
                <Link href={`/archiv/${d.id}`} className="font-medium">{d.title || "Ohne Titel"}</Link>
                <span className="text-muted"> · {TYPE_LABELS[d.type]}{d.heldOn ? ` · ${d.heldOn.slice(0, 4)}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/archiv?stelle=${encodeURIComponent(short)}`} className="text-sm">Im Archiv nach {short} suchen</Link>
      </section>
    </aside>
  );
}

function MissingData() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-10 sm:px-10">
      <BibleTabs active="/bibel" />
      <div className="card flex flex-col gap-3">
        <h1 className="font-serif text-2xl font-semibold">Bibeldaten fehlen</h1>
        <p className="text-ink-2">Die Datei <span className="font-mono text-sm">bible.db</span> wurde nicht gefunden. In der Mac-App ist sie enthalten; bitte die aktuelle Version installieren.</p>
      </div>
    </div>
  );
}
