import "server-only";
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { bookByNumber } from "./books";
import { END_VERSE, formatRef, splitId, verseId, type BibleRef } from "./refs";

// Zugriff auf bible.db (nur lesen). Erzeugt von scripts/bible/build.mjs.

export type Translation = { id: string; name: string; short: string; lang: string; license: string; notice: string };
export type Word = { pos: number; lang: "grc" | "hbo"; surface: string; translit: string; gloss: string; strong: string; estrong: string; grammar: string; lemma: string; variant: boolean };
export type LexiconEntry = { estrong: string; strong: string; lemma: string; translit: string; morph: string; gloss: string; definition: string };

const globalForBible = globalThis as unknown as { dmsBible?: Database.Database | null };

function candidates() {
  return [process.env.BIBLE_PATH, join(/* turbopackIgnore: true */ process.cwd(), "bible", "bible.db"), join(/* turbopackIgnore: true */ process.cwd(), "data", "bible.db")].filter(Boolean) as string[];
}

function open(): Database.Database | null {
  const path = candidates().find((p) => existsSync(/* turbopackIgnore: true */ p));
  if (!path) return null;
  const db = new Database(/* turbopackIgnore: true */ path, { readonly: true, fileMustExist: true });
  db.pragma("query_only = ON");
  return db;
}

function bdb(): Database.Database {
  if (globalForBible.dmsBible === undefined) globalForBible.dmsBible = open();
  if (!globalForBible.dmsBible) throw new Error("Bibeldaten fehlen (bible.db nicht gefunden).");
  return globalForBible.dmsBible;
}

export function bibleAvailable(): boolean {
  if (globalForBible.dmsBible === undefined) globalForBible.dmsBible = open();
  return Boolean(globalForBible.dmsBible);
}

let trCache: Translation[] | undefined;
export function translations(): Translation[] {
  trCache ??= bdb().prepare("SELECT id, name, short, lang, license, notice FROM translations ORDER BY sort").all() as Translation[];
  return trCache;
}

export const DEFAULT_TRANSLATION = "luther1912";

/** Nur bekannte Übersetzungen, höchstens `max`, ohne Doppel. */
export function validTranslations(ids: string[], max = 3): string[] {
  const known = new Set(translations().map((t) => t.id));
  const out = [...new Set(ids.filter((id) => known.has(id)))].slice(0, max);
  return out.length ? out : [DEFAULT_TRANSLATION];
}

export function extraNotices(): string[] {
  const row = bdb().prepare("SELECT value FROM meta WHERE key = 'notices'").get() as { value: string } | undefined;
  return row ? (JSON.parse(row.value) as string[]) : [];
}

// ── Lesen ────────────────────────────────────────────────────────────────────

/** Ein Kapitel in mehreren Übersetzungen, Vers für Vers. */
export function chapter(trs: string[], book: number, ch: number) {
  const rows = bdb()
    .prepare(`SELECT tr, id, text FROM verses WHERE tr IN (${trs.map(() => "?").join(",")}) AND id BETWEEN ? AND ? ORDER BY id`)
    .all(...trs, verseId(book, ch, 0), verseId(book, ch, END_VERSE)) as { tr: string; id: number; text: string }[];
  const byVerse = new Map<number, Record<string, string>>();
  for (const r of rows) byVerse.set(r.id, { ...(byVerse.get(r.id) ?? {}), [r.tr]: r.text });
  return [...byVerse.entries()].map(([id, texts]) => ({ id, verse: id % 1000, texts }));
}

export function versesInRange(tr: string, start: number, end: number) {
  return bdb().prepare("SELECT id, text FROM verses WHERE tr = ? AND id BETWEEN ? AND ? ORDER BY id").all(tr, start, end) as { id: number; text: string }[];
}

/** Text einer Stelle für den Bibel-Block: ein Vers ohne Nummer, mehrere mit hochgestellten Versnummern. */
export function textForRef(tr: string, ref: Pick<BibleRef, "start" | "end">): string {
  const verses = versesInRange(tr, ref.start, ref.end);
  if (verses.length <= 1) return verses[0]?.text ?? "";
  const multiChapter = splitId(verses[0].id).chapter !== splitId(verses.at(-1)!.id).chapter;
  return verses
    .map((v) => {
      const { chapter: c, verse } = splitId(v.id);
      return `${multiChapter ? `${c},${verse}` : verse} ${v.text}`;
    })
    .join(" ");
}

// ── Grundtext & Lexikon ─────────────────────────────────────────────────────

export function words(verse: number): Word[] {
  return (
    bdb().prepare("SELECT pos, lang, surface, translit, gloss, strong, estrong, grammar, lemma, variant FROM words WHERE verse = ? ORDER BY variant, pos").all(verse) as (Omit<Word, "variant"> & { variant: number })[]
  ).map((w) => ({ ...w, variant: Boolean(w.variant) }));
}

/** Lexikon-Eintrag zu "G4102G", "G4102" oder "H430" – bei unbekannter Erweiterung die Grundnummer. */
export function lexicon(key: string): LexiconEntry | undefined {
  const k = key.trim();
  const db = bdb();
  const exact = db.prepare("SELECT * FROM lexicon WHERE estrong = ?").get(k) as LexiconEntry | undefined;
  if (exact) return exact;
  const m = /^([GH])0*(\d+)([A-Za-z]?)$/.exec(k);
  if (!m) return undefined;
  const padded = `${m[1]}${m[2].padStart(4, "0")}`;
  return (db.prepare("SELECT * FROM lexicon WHERE estrong = ? OR estrong = ?").get(padded, `${padded}G`) ??
    db.prepare("SELECT * FROM lexicon WHERE strong = ? ORDER BY estrong LIMIT 1").get(`${m[1]}${m[2]}`)) as LexiconEntry | undefined;
}

export const normalizeStrong = (key: string) => {
  const m = /^([GHgh])0*(\d+)/.exec(key.trim());
  return m ? `${m[1].toUpperCase()}${m[2]}` : "";
};

/** Alle Vorkommen einer Strong-Nummer (Hauptlesart), mit Anzahl je Buch. */
export function strongOccurrences(strong: string, limit = 200, offset = 0) {
  const db = bdb();
  const total = (db.prepare("SELECT count(*) n FROM words WHERE strong = ? AND variant = 0").get(strong) as { n: number }).n;
  const byBook = db
    .prepare("SELECT verse / 1000000 AS book, count(*) n FROM words WHERE strong = ? AND variant = 0 GROUP BY book ORDER BY book")
    .all(strong) as { book: number; n: number }[];
  const rows = db
    .prepare("SELECT verse, group_concat(surface, ' ') AS forms FROM words WHERE strong = ? AND variant = 0 GROUP BY verse ORDER BY verse LIMIT ? OFFSET ?")
    .all(strong, limit, offset) as { verse: number; forms: string }[];
  const verses = (db.prepare("SELECT count(DISTINCT verse) n FROM words WHERE strong = ? AND variant = 0").get(strong) as { n: number }).n;
  return { total, verses, byBook, rows };
}

export function crossrefs(verse: number, limit = 12) {
  return (bdb().prepare("SELECT to_start AS start, to_end AS end, votes FROM crossrefs WHERE from_id = ? ORDER BY votes DESC LIMIT ?").all(verse, limit) as { start: number; end: number; votes: number }[]).map((r) => ({
    ...r,
    label: formatRef(r),
  }));
}

// ── Konkordanz ───────────────────────────────────────────────────────────────

export type SearchMode = "wort" | "anfang" | "gruppe";
export const HIT_START = "\u0001";
export const HIT_END = "\u0002";

/** Suchbegriff in eine sichere FTS5-Abfrage übersetzen (nur Buchstaben/Ziffern). */
export function ftsQuery(input: string, mode: SearchMode): string | null {
  const tokens = input
    .normalize("NFC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8);
  if (!tokens.length) return null;
  if (mode === "gruppe") return `"${tokens.join(" ")}"`;
  return tokens.map((t) => (mode === "anfang" ? `"${t}"*` : `"${t}"`)).join(" AND ");
}

export function concordance(input: string, tr: string, mode: SearchMode, opts: { book?: number; limit?: number; offset?: number } = {}) {
  const query = ftsQuery(input, mode);
  if (!query) return { query: null, total: 0, byBook: [], results: [] };
  const db = bdb();
  const bookFilter = opts.book ? "AND v.id BETWEEN ? AND ?" : "";
  const bookArgs = opts.book ? [opts.book * 1_000_000, opts.book * 1_000_000 + 999_999] : [];
  const byBook = db
    .prepare(`SELECT v.id / 1000000 AS book, count(*) n FROM verses_fts JOIN verses v ON v.rowid = verses_fts.rowid WHERE verses_fts MATCH ? AND v.tr = ? GROUP BY book ORDER BY book`)
    .all(query, tr) as { book: number; n: number }[];
  const total = byBook.filter((b) => !opts.book || b.book === opts.book).reduce((s, b) => s + b.n, 0);
  const results = db
    .prepare(
      `SELECT v.id, highlight(verses_fts, 0, '${HIT_START}', '${HIT_END}') AS text FROM verses_fts JOIN verses v ON v.rowid = verses_fts.rowid
       WHERE verses_fts MATCH ? AND v.tr = ? ${bookFilter} ORDER BY v.id LIMIT ? OFFSET ?`,
    )
    .all(query, tr, ...bookArgs, opts.limit ?? 100, opts.offset ?? 0) as { id: number; text: string }[];
  return { query, total, byBook, results };
}

/** Lesbare Stellenangabe mit vollem Buchnamen, z. B. "Römer 8,28". */
export const verseLabel = (id: number) => {
  const { book, chapter: c, verse } = splitId(id);
  return `${bookByNumber(book).name} ${c},${verse}`;
};
