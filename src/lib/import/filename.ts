import type { DocStatus, DocType } from "@/db/schema";
import { bookByNumber } from "@/lib/bible/books";
import { findRefSpans, formatRef, parseRef } from "@/lib/bible/refs";

// Liest Angaben aus Ordner und Dateiname, z. B.
//   "Bibelstunde/2023-08-23 Bibelstunde WHV (Markus 1,1ff.)_Epilog zum Markusevangelium.docx"
//   → gehalten 23.08.2023, Bibelstudie, Ort WHV, Haupttext Mk 1,1ff, Titel "Epilog zum Markusevangelium"

export type FileMeta = {
  title: string;
  type: DocType;
  status: DocStatus;
  heldOn: string | null;
  place: string;
  occasion: string;
  series: string;
  mainRef: string;
  topics: string[];
  /** Titel nur behelfsweise aus dem Dateinamen – besser die erste Zeile des Dokuments nehmen. */
  titleGuessed: boolean;
};

/** Art des Beitrags am Anfang des Namens (längere zuerst). */
const KINDS: { re: RegExp; type: DocType; occasion: string }[] = [
  { re: /^schlusswort\s+hochzeit(?=[\s_(]|$)/i, type: "predigt", occasion: "Hochzeit" },
  { re: /^heilig(?:er)?\s*abend(?=[\s_(]|$)/i, type: "predigt", occasion: "Heiligabend" },
  { re: /^predigt(?=[\s_(]|$)/i, type: "predigt", occasion: "Gottesdienst" },
  { re: /^bibel(?:stunde|arbeit)(?=[\s_(]|$)/i, type: "bibelstudie", occasion: "Bibelstunde" },
  { re: /^gebetsstunde(?=[\s_(]|$)/i, type: "andacht", occasion: "Gebetsstunde" },
  { re: /^einleitung(?=[\s_(]|$)/i, type: "andacht", occasion: "Einleitung" },
  { re: /^andacht(?=[\s_(]|$)/i, type: "andacht", occasion: "Andacht" },
  { re: /^hochzeit(?=[\s_(]|$)/i, type: "predigt", occasion: "Hochzeit" },
  { re: /^schlusswort(?=[\s_(]|$)/i, type: "predigt", occasion: "Schlusswort" },
  { re: /^kurzbeitrag(?=[\s_(]|$)/i, type: "predigt", occasion: "Kurzbeitrag" },
  { re: /^gemeindestunde(?=[\s_(]|$)/i, type: "vortrag", occasion: "Gemeindestunde" },
  { re: /^(?:jugendthema|jugendstunde|jug_st)(?=[\s_(]|$)/i, type: "vortrag", occasion: "Jugendstunde" },
  { re: /^thema(?=[\s_(]|$)/i, type: "vortrag", occasion: "" },
  { re: /^vortrag(?=[\s_(]|$)/i, type: "vortrag", occasion: "" },
  { re: /^gedicht(?=[\s_(]|$)/i, type: "notiz", occasion: "Gedicht" },
];

/** Ordnernamen → Art. Diese Ordner sind Sammelordner und werden nicht zu Themen. */
const FOLDERS: { re: RegExp; type: DocType }[] = [
  { re: /predigt/i, type: "predigt" },
  { re: /bibel(?:stunde|arbeit)/i, type: "bibelstudie" },
  { re: /gebetsstunde/i, type: "andacht" },
  { re: /einleitung/i, type: "andacht" },
  { re: /andacht/i, type: "andacht" },
  { re: /gedicht/i, type: "notiz" },
  { re: /^themen?$|vortr/i, type: "vortrag" },
];
const GENERIC_FOLDER = /^(predigten|sonstige predigten|bibelstunden?|gebetsstunden?|einleitungen|gedichte|themen|vorträge|andachten|reserve.*|wortbeiträge)$/i;

const clean = (s: string) =>
  s
    .replace(/_+/g, " – ")
    .replace(/\s+/g, " ")
    .replace(/^[\s–\-.,:;]+|[\s–\-,:;]+$/g, "")
    .trim();

/** "Johannes 21.1ff." → "Johannes 21,1ff." (Punkt statt Komma in Dateinamen). */
const fixVerseDot = (s: string) => s.replace(/(\p{L}\.?\s?\d{1,3})\.(\d{1,3})/gu, "$1,$2");

export function parseFileName(relPath: string): FileMeta {
  const parts = relPath.split(/[\\/]/).filter(Boolean);
  const file = parts.pop() ?? "";
  const folders = parts;
  let rest = file.replace(/\.[a-z0-9]{1,5}$/i, "").replace(/\s+/g, " ").trim();

  // Datum am Anfang: "2023-08-23 …" (sonst evtl. nur Jahr "2026 …").
  let heldOn: string | null = null;
  // Auch mit Tippfehlern ("2024-0-21", "2019-07-xx"): dann ohne Datum, aber nicht im Titel.
  const date = rest.match(/^(\d{4})-(\d{1,2}|x{1,2})-(\d{1,2}|x{1,2})\s*/i);
  if (date) {
    const [y, mo, d] = [Number(date[1]), Number(date[2]), Number(date[3])];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y > 1950) heldOn = `${date[1]}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    rest = rest.slice(date[0].length);
  } else {
    rest = rest.replace(/^\d{4}\s+/, "");
  }

  // Art ("Predigt", "Bibelstunde", …), evtl. mit Ordnungszahl davor ("2te Predigt …")
  rest = rest.replace(/^\d+\.?(?:te|ter)\s+(?=\p{L})/u, "");
  let type: DocType | undefined;
  let occasion = "";
  let kindFound = false;
  for (const k of KINDS) {
    const m = rest.match(k.re);
    if (m) {
      type = k.type;
      occasion = k.occasion;
      kindFound = true;
      rest = rest.slice(m[0].length).trim();
      break;
    }
  }
  if (!type) {
    for (const folder of [...folders].reverse()) {
      const f = FOLDERS.find((x) => x.re.test(folder));
      if (f) {
        type = f.type;
        break;
      }
    }
  }

  // Aufteilen: [Ort] [Reihe] (Inhalt der letzten Klammer) _Nachsatz
  let place = "";
  let series = "";
  let title = "";
  let mainRef = "";
  // Titel-artige Namen ohne Ort: "Thema …", "Gedicht …" oder gar keine Art erkannt.
  const titleLike = !kindFound || occasion === "" || type === "notiz";
  let open = rest.lastIndexOf("(");
  let close = rest.indexOf(")", open);
  if (open >= 0 && close < 0) close = rest.length; // fehlende schließende Klammer
  if (open >= 0) {
    const pre = rest.slice(0, open).trim();
    const inner = fixVerseDot(rest.slice(open + 1, close).trim())
      .replace(/(\d)_(\d)/g, "$1-$2") // "Röm12,1_2"
      .replace(/(?:\s*\bff?\.)+$/, (m) => (m.trim().startsWith("ff") ? "ff." : "f.")); // "54ff.ff."
    const after = rest.slice(close + 1).trim();
    let innerTitle = "";
    if (inner && !/^pp$/i.test(inner)) {
      const spans = findRefSpans(inner);
      if (spans.length && spans[0].start <= 1) {
        mainRef = inner.slice(spans[0].start, spans[0].end).trim();
        innerTitle = clean(inner.slice(spans[0].end).replace(/^(?:\s*f{1,2}\.?(?!\p{L}))+/u, ""));
      } else {
        innerTitle = clean(inner);
        if (spans.length) mainRef = inner.slice(spans[0].start, spans[0].end).trim();
      }
    }
    if (titleLike) {
      // "Thema_Berg des Gebets (PP)", "Thema Berg der Rettung (Kinderfreizeit 2018)"
      const head = clean(pre);
      title = head && innerTitle ? `${head} (${innerTitle})` : head || innerTitle;
    } else {
      const words = pre.split(" ").filter(Boolean);
      if (occasion === "Hochzeit" && pre) {
        // "Hochzeit Titus und Laurena (Das Dankamt)": Namen gehören zum Titel, nicht zum Ort.
        title = innerTitle ? `${innerTitle} (${clean(pre)})` : clean(pre);
        if (after.startsWith("_")) title = clean(after);
      } else if (words.length && /^[A-ZÄÖÜ]{2,}\.?$/.test(words[0])) {
        place = words[0]; // "WHV Könige Israels" → Ort WHV, Reihe "Könige Israels"
        series = clean(words.slice(1).join(" "));
      } else if (words.length > 3) {
        series = clean(pre); // "Grenzen im Leben des Gläubigen"
      } else {
        place = clean(pre);
      }
      if (!(occasion === "Hochzeit" && pre)) title = innerTitle;
    }
    if (after.startsWith("_")) title = clean(after);
  } else if (titleLike || rest.startsWith("_")) {
    title = clean(rest);
  } else {
    // Ohne Klammer: erstes Wort ist Ort, wenn es eine Abkürzung ist ("WHV König Joas").
    const words = rest.split(" ").filter(Boolean);
    if (words.length && /^[A-ZÄÖÜ]{2,}\.?$/.test(words[0])) place = words.shift()!;
    title = clean(words.join(" "));
  }

  // Bibelstelle als eigenes Segment im Titel ("Gott offenbart sich im Wort – Johannes 14,6").
  if (!mainRef && title) {
    const segments = title.split(" – ");
    const refSegment = segments.find((s) => {
      const spans = findRefSpans(fixVerseDot(s));
      return spans.length === 1 && spans[0].start === 0 && spans[0].end >= s.trim().length - 2;
    });
    if (refSegment) {
      mainRef = fixVerseDot(refSegment).trim();
      if (segments.length > 1) title = segments.filter((s) => s !== refSegment).join(" – ");
    }
  }

  const ref = mainRef ? parseRef(mainRef) : undefined;
  let titleGuessed = false;
  if (!title) {
    titleGuessed = !ref;
    title = ref ? formatRef(ref, "name") : clean(file.replace(/\.[a-z0-9]{1,5}$/i, "").replace(/\s*\(\s*\)\s*/g, " "));
  }

  // Themen: Unterordner, die keine Sammelordner sind ("Themen/Gebet" → "Gebet").
  const topics = folders
    .filter((f) => !GENERIC_FOLDER.test(f.trim()))
    .map((f) => f.replace(/_+/g, ", ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const finalType = type ?? "predigt";
  const unfinished = folders.some((f) => /reserve|unfertig|entw[uü]rf/i.test(f));
  return {
    title,
    type: finalType,
    status: unfinished ? "entwurf" : heldOn ? "gehalten" : "fertig",
    heldOn,
    place,
    occasion,
    series: series || (finalType === "bibelstudie" && ref ? `Bibelstunde ${bookByNumber(ref.book).name}` : ""),
    mainRef: ref ? formatRef(ref) : mainRef,
    topics,
    titleGuessed,
  };
}
