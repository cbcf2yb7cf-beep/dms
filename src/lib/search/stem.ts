import { newStemmer } from "snowball-stemmers";

// Deutsche Wortstämme (Snowball): "Vergebung", "vergeben" → "vergeb"; "Kindern" → "kind".

const german = newStemmer("german");
const WORD = /[\p{L}\p{N}]+/gu;

export const words = (text: string) => text.match(WORD) ?? [];

export function stem(word: string): string {
  const w = word.toLowerCase();
  return /^\p{N}+$/u.test(w) ? w : german.stem(w);
}

/** Text → Wortstämme, mit Leerzeichen getrennt (für den Suchindex). */
export function stemText(text: string): string {
  return words(text).map(stem).join(" ");
}

export type ParsedQuery = { fts: string; stems: string[] } | null;

/**
 * Suchanfrage → FTS5-Ausdruck über Wortstämme.
 * - Wörter: Stamm als Wortanfang ("hoffen" → hoff* findet auch "Hoffnung")
 * - "in Anführungszeichen": genau diese Wortfolge
 * - -wort: ausschließen
 */
export function parseQuery(input: string): ParsedQuery {
  const include: string[] = [];
  const exclude: string[] = [];
  const stems: string[] = [];
  for (const m of input.normalize("NFC").matchAll(/(-?)"([^"]+)"|(-?)(\S+)/g)) {
    const negate = (m[1] || m[3]) === "-";
    const phrase = m[2] !== undefined;
    const st = words(phrase ? m[2] : m[4]).map(stem);
    if (!st.length) continue;
    const expr = phrase ? `"${st.join(" ")}"` : st.map((s) => `"${s}"*`).join(" AND ");
    if (negate) exclude.push(expr);
    else {
      include.push(`(${expr})`);
      stems.push(...st);
    }
  }
  if (!include.length) return null; // nur Ausschlüsse ergeben keine sinnvolle Suche
  return { fts: include.join(" AND ") + exclude.map((e) => ` NOT (${e})`).join(""), stems };
}

/**
 * Textausschnitt um den ersten Treffer, Treffer mit \u0001…\u0002 markiert.
 * Ein Wort trifft, wenn sein Stamm mit einem gesuchten Stamm beginnt.
 */
export function snippet(text: string, stems: string[], radius = 110): string | null {
  if (!text || !stems.length) return null;
  const hits: [number, number][] = [];
  for (const m of text.matchAll(WORD)) {
    const s = stem(m[0]);
    if (stems.some((q) => s.startsWith(q))) hits.push([m.index!, m.index! + m[0].length]);
  }
  if (!hits.length) return null;
  const from = Math.max(0, hits[0][0] - radius);
  const to = Math.min(text.length, hits[0][1] + radius * 1.6);
  let out = "";
  let pos = from;
  for (const [a, b] of hits) {
    if (a < from || b > to) continue;
    out += text.slice(pos, a) + "\u0001" + text.slice(a, b) + "\u0002";
    pos = b;
  }
  out += text.slice(pos, to);
  return `${from > 0 ? "… " : ""}${out.replace(/\s+/g, " ").trim()}${to < text.length ? " …" : ""}`;
}
