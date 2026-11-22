import { bookByNumber, findBook, type Book } from "./books";

// Bibelstellen als Zahlen: Buch·1.000.000 + Kapitel·1.000 + Vers (BBCCCVVV).
// Ein Bereich ist [start, end]; so findet ein einfaches Überlappen
// (start <= qEnd AND end >= qStart) alle Stellen zu "Röm 8".
// Vers 999 steht für "bis Kapitelende".

export const END_VERSE = 999;
const MAX_VERSE = 200; // Ps 119 hat 176 Verse

export type BibleRef = { book: number; start: number; end: number };

export const verseId = (book: number, chapter: number, verse: number) => book * 1_000_000 + chapter * 1_000 + verse;

export function splitId(id: number) {
  return { book: Math.floor(id / 1_000_000), chapter: Math.floor(id / 1_000) % 1_000, verse: id % 1_000 };
}

// ── Formatieren ─────────────────────────────────────────────────────────────

/** "Röm 8", "Röm 8,28", "Röm 8,28–30", "Röm 8,28ff", "Mt 5–7", "Mt 5,3–7,29", "Jud 3". */
export function formatRef({ start, end }: { start: number; end: number }, style: "abbr" | "name" = "abbr"): string {
  const a = splitId(start);
  const b = splitId(end);
  const book = bookByNumber(a.book);
  const name = style === "abbr" ? book.abbr : book.name;
  const single = book.chapters === 1;
  const verse = (v: number) => (v === END_VERSE ? "" : String(v));

  if (a.chapter === b.chapter) {
    const ch = single ? "" : `${a.chapter}`;
    const sep = single ? "" : ",";
    if (a.verse === 1 && b.verse === END_VERSE) return single ? name : `${name} ${a.chapter}`;
    if (a.verse === b.verse) return `${name} ${ch}${sep}${a.verse}`;
    if (b.verse === END_VERSE) return `${name} ${ch}${sep}${a.verse}ff`;
    return `${name} ${ch}${sep}${a.verse}–${b.verse}`;
  }
  if (a.verse === 1 && b.verse === END_VERSE) return `${name} ${a.chapter}–${b.chapter}`;
  return `${name} ${a.chapter},${a.verse}–${b.chapter}${b.verse === END_VERSE ? "" : `,${verse(b.verse)}`}`;
}

// ── Erkennen ────────────────────────────────────────────────────────────────

// Buchkandidat: optionale Ziffer 1–5 ("1. Mose", "1Kor"), dann ein Wort mit großem Anfangsbuchstaben.
const BOOK_RE = /(?<![\p{L}\p{N}])((?:[1-5]\.?\s?)?\p{Lu}\p{Ll}{0,16})\.?\s?(?=\d)/gu;
const NEW_BOOK_AHEAD = /(?:[1-5]\.?\s?)?\p{Lu}/uy;
const CHAPTER = /(\d{1,3})/y;
const VERSE = /\s?[,:]\s?(\d{1,3})/y;
const RANGE = /\s?(?:[-–—]|bis)\s?(\d{1,3})(?:\s?[,:]\s?(\d{1,3}))?/y;
const SUFFIX = /\s?(ff|f)(?!\p{L})\.?/uy;
const MORE = /\.(\d{1,3})(?:\s?[-–—]\s?(\d{1,3}))?(?:\s?(ff|f)(?!\p{L}))?/uy;
const NEXT = /\s?;\s?(?=\d)/y;

function match(re: RegExp, text: string, pos: number) {
  re.lastIndex = pos;
  return re.exec(text);
}

const validVerse = (v: number) => v >= 1 && v <= MAX_VERSE;
const validChapter = (book: Book, c: number) => c >= 1 && c <= book.chapters;

/**
 * Findet alle Bibelstellen in einem Text, z. B. "Hebr 11,1-3; 12,1f und Röm 8".
 * Ergebnis ohne Duplikate, in Fundreihenfolge.
 */
export function parseRefs(text: string): BibleRef[] {
  return scanRefs(text).refs;
}

/** Wo im Text stehen Bibelstellen? Je Buchangabe ein Bereich [start, end) – z. B. um Titel und Stelle zu trennen. */
export function findRefSpans(text: string): { start: number; end: number }[] {
  return scanRefs(text).spans;
}

function scanRefs(text: string): { refs: BibleRef[]; spans: { start: number; end: number }[] } {
  const spans: { start: number; end: number }[] = [];
  const out: BibleRef[] = [];
  const seen = new Set<string>();
  let hit = false; // in der aktuellen Buchangabe eine gültige Stelle erkannt (auch wenn doppelt)
  const push = (r: BibleRef) => {
    if (r.end >= r.start) hit = true;
    const key = `${r.start}-${r.end}`;
    if (r.end < r.start || seen.has(key)) return;
    seen.add(key);
    out.push(r);
  };

  BOOK_RE.lastIndex = 0;
  for (let m = BOOK_RE.exec(text); m; m = BOOK_RE.exec(text)) {
    const book = findBook(m[1]);
    if (!book) continue;
    let pos = m.index + m[0].length;
    let first = true;
    hit = false;

    while (true) {
      const c = match(CHAPTER, text, pos);
      if (!c) break;
      const chNum = Number(c[1]);
      pos = CHAPTER.lastIndex;

      const v = match(VERSE, text, pos);
      if (!v && book.ambiguous && first) break; // "am 5. Mai" ist keine Stelle

      if (book.chapters === 1 && !v) {
        // Einkapitelige Bücher: "Jud 3" = Vers 3.
        if (!validVerse(chNum)) break;
        let endV = chNum;
        const r = match(RANGE, text, pos);
        if (r && !r[2] && Number(r[1]) >= chNum && validVerse(Number(r[1]))) {
          endV = Number(r[1]);
          pos = RANGE.lastIndex;
        }
        push({ book: book.n, start: verseId(book.n, 1, chNum), end: verseId(book.n, 1, endV) });
      } else {
        if (!validChapter(book, chNum)) break;

        if (!v) {
          // Nur Kapitel, evtl. Kapitelbereich "Mt 5–7" oder "Mt 5–7,29".
          let endCh = chNum;
          let endV = END_VERSE;
          const r = match(RANGE, text, pos);
          if (r && Number(r[1]) > chNum && validChapter(book, Number(r[1]))) {
            endCh = Number(r[1]);
            if (r[2] && validVerse(Number(r[2]))) endV = Number(r[2]);
            pos = RANGE.lastIndex;
          }
          push({ book: book.n, start: verseId(book.n, chNum, 1), end: verseId(book.n, endCh, endV) });
        } else {
          const v1 = Number(v[1]);
          if (!validVerse(v1)) break;
          pos = VERSE.lastIndex;
          let endCh = chNum;
          let endV = v1;

          const r = match(RANGE, text, pos);
          if (r) {
            if (r[2]) {
              const c2 = Number(r[1]);
              const v2 = Number(r[2]);
              if (c2 > chNum && validChapter(book, c2) && validVerse(v2)) {
                endCh = c2;
                endV = v2;
                pos = RANGE.lastIndex;
              }
            } else if (Number(r[1]) >= v1 && validVerse(Number(r[1]))) {
              endV = Number(r[1]);
              pos = RANGE.lastIndex;
            }
          } else {
            const s = match(SUFFIX, text, pos);
            if (s) {
              endV = s[1] === "ff" ? END_VERSE : v1 + 1;
              pos = SUFFIX.lastIndex;
            }
          }
          push({ book: book.n, start: verseId(book.n, chNum, v1), end: verseId(book.n, endCh, endV) });

          // Weitere Verse im selben Kapitel: "Joh 3,16.18" oder "Röm 8,1.28-30".
          for (let more = match(MORE, text, pos); more; more = match(MORE, text, pos)) {
            const a = Number(more[1]);
            if (!validVerse(a)) break;
            let b = a;
            if (more[2] && Number(more[2]) >= a && validVerse(Number(more[2]))) b = Number(more[2]);
            else if (more[3]) b = more[3] === "ff" ? END_VERSE : a + 1;
            push({ book: book.n, start: verseId(book.n, chNum, a), end: verseId(book.n, chNum, b) });
            pos = MORE.lastIndex;
          }
        }
      }

      // "; 12,1" = weiteres Kapitel desselben Buchs, "; 1Kor 13" = neues Buch (äußere Schleife).
      const next = match(NEXT, text, pos);
      if (!next) break;
      const afterNext = NEXT.lastIndex;
      if (match(NEW_BOOK_AHEAD, text, afterNext)?.[0].match(/\p{Lu}/u)) break;
      pos = afterNext;
      first = false;
    }
    if (hit) spans.push({ start: m.index, end: pos });
    BOOK_RE.lastIndex = Math.max(BOOK_RE.lastIndex, pos);
  }
  return { refs: out, spans };
}

/** Eine einzelne Eingabe wie "Röm 8" für Suchfelder; undefined, wenn keine Stelle erkannt. */
export function parseRef(input: string): BibleRef | undefined {
  return parseRefs(input.trim())[0];
}

/** Überlappen zwei Bereiche? */
export const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start <= b.end && a.end >= b.start;
