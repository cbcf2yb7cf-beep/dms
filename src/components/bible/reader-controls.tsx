"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Book = { n: number; name: string; chapters: number };
const YEAR = 60 * 60 * 24 * 365;

/** Buch, Kapitel und Übersetzungen wählen. Merkt sich die letzte Stelle und Auswahl (Cookie). */
export function ReaderControls({
  books,
  book,
  chapter,
  translations,
  selected,
}: {
  books: Book[];
  book: number;
  chapter: number;
  translations: { id: string; short: string; name: string; lang: string }[];
  selected: string[];
}) {
  const router = useRouter();
  const current = books.find((b) => b.n === book)!;
  const go = (b: number, c: number, trs = selected) => router.push(`/bibel?b=${b}&c=${c}&tr=${trs.join(",")}`);

  useEffect(() => {
    document.cookie = `dms-bibel=${book}:${chapter}:${selected.join(",")}; path=/; max-age=${YEAR}; samesite=lax`;
  }, [book, chapter, selected]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="bb" className="label">Buch</label>
        <select id="bb" value={book} onChange={(e) => go(Number(e.target.value), 1)} className="input w-auto pr-8">
          <optgroup label="Altes Testament">
            {books.filter((b) => b.n <= 39).map((b) => <option key={b.n} value={b.n}>{b.name}</option>)}
          </optgroup>
          <optgroup label="Neues Testament">
            {books.filter((b) => b.n > 39).map((b) => <option key={b.n} value={b.n}>{b.name}</option>)}
          </optgroup>
        </select>
      </div>
      <div>
        <label htmlFor="bc" className="label">Kapitel</label>
        <select id="bc" value={chapter} onChange={(e) => go(book, Number(e.target.value))} className="input w-24">
          {Array.from({ length: current.chapters }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
      </div>
      <fieldset className="flex flex-col">
        <legend className="label">Übersetzungen (bis zu 3)</legend>
        <div className="flex flex-wrap gap-1.5">
          {translations.map((t) => {
            const on = selected.includes(t.id);
            const next = on ? selected.filter((s) => s !== t.id) : [...selected, t.id].slice(-3);
            return (
              <button
                key={t.id}
                type="button"
                title={t.name}
                aria-pressed={on}
                disabled={on && selected.length === 1}
                onClick={() => go(book, chapter, next)}
                className={`min-h-11 rounded-lg border px-3 text-sm ${on ? "border-accent bg-accent-soft font-semibold text-ink" : "border-border-strong bg-surface text-ink-2 hover:border-accent"}`}
              >
                {t.short}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
