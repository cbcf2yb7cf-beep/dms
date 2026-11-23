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

// Füllwörter, die in natürlich formulierten Fragen nichts zur Suche beitragen.
const STOPWORDS = new Set(
  "der die das den dem des ein eine einer eines einem einen und oder aber auch als am an auf aus bei bin bis da damit dann darüber dass daß denn doch du er es etwas für gegen gesagt gesprochen gepredigt geschrieben hab habe haben hat hatte ich ihr im in ist ja kann man mein meine mir mich mit nach nicht noch nur ob schon sein sich sie sind so über um und uns von vor was welche welcher welches wenn wer wie wo wir wird zu zum zur zwischen".split(" "),
);

/** Natürlich formulierte Frage → FTS5-Ausdruck, bei dem schon ein Begriff genügt (Relevanz sortiert). */
export function parseQuestion(input: string): ParsedQuery {
  const st = [...new Set(words(input.normalize("NFC")).filter((w) => !STOPWORDS.has(w.toLowerCase()) && w.length > 1).map(stem))];
  if (!st.length) return null;
  return { fts: st.map((s) => `"${s}"*`).join(" OR "), stems: st };
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

/** Bis zu `max` nicht überlappende Textstellen rund um Treffer (für die Archivfrage an Claude). */
export function passages(text: string, stems: string[], max = 3, radius = 380): string[] {
  if (!text) return [];
  const hits: number[] = [];
  for (const m of text.matchAll(WORD)) if (stems.some((q) => stem(m[0]).startsWith(q))) hits.push(m.index!);
  const out: string[] = [];
  let end = -1;
  for (const h of hits) {
    if (h < end) continue;
    const from = Math.max(0, h - radius);
    const to = Math.min(text.length, h + radius);
    out.push(`${from > 0 ? "… " : ""}${text.slice(from, to).replace(/\s+/g, " ").trim()}${to < text.length ? " …" : ""}`);
    end = to;
    if (out.length >= max) break;
  }
  return out;
}
