// Erzeugt data/bible.db (nur lesend genutzt) aus freien Quellen, siehe sources.mjs.
// Aufruf: node scripts/bible/build.mjs [ausgabe.db]   (Cache: BIBLE_CACHE, Standard .bible-cache)
import Database from "better-sqlite3";
import JSZip from "jszip";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { CROSSREFS, EXTRA_NOTICES, OSIS_BOOKS, STEP_BOOKS, STEP_COMMIT, STEP_FILES, TRANSLATIONS, VPL_BOOKS } from "./sources.mjs";

const OUT = resolve(process.argv[2] ?? "data/bible.db");
const CACHE = resolve(process.env.BIBLE_CACHE ?? ".bible-cache");
mkdirSync(CACHE, { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });

const id = (b, c, v) => b * 1_000_000 + c * 1_000 + v;
const log = (...a) => console.log("[bibel]", ...a);
const hashes = {};

async function fetchCached(url, file) {
  const path = join(CACHE, file);
  if (!existsSync(path)) {
    log("lade", file);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  const buf = readFileSync(path);
  hashes[file] = createHash("sha256").update(buf).digest("hex");
  return buf;
}

// ── Datenbank ────────────────────────────────────────────────────────────────
const tmp = `${OUT}.tmp`;
rmSync(tmp, { force: true });
const db = new Database(tmp);
db.pragma("journal_mode = OFF");
db.pragma("synchronous = OFF");
db.exec(`
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE translations (id TEXT PRIMARY KEY, name TEXT NOT NULL, short TEXT NOT NULL, lang TEXT NOT NULL, license TEXT NOT NULL, notice TEXT NOT NULL, sort INTEGER NOT NULL, verses INTEGER NOT NULL DEFAULT 0);
CREATE TABLE verses (rowid INTEGER PRIMARY KEY, tr TEXT NOT NULL, id INTEGER NOT NULL, text TEXT NOT NULL);
CREATE TABLE words (verse INTEGER NOT NULL, pos INTEGER NOT NULL, lang TEXT NOT NULL, surface TEXT NOT NULL, translit TEXT NOT NULL, gloss TEXT NOT NULL, strong TEXT NOT NULL, estrong TEXT NOT NULL, grammar TEXT NOT NULL, lemma TEXT NOT NULL, variant INTEGER NOT NULL DEFAULT 0);
CREATE TABLE lexicon (estrong TEXT PRIMARY KEY, strong TEXT NOT NULL, lemma TEXT NOT NULL, translit TEXT NOT NULL, morph TEXT NOT NULL, gloss TEXT NOT NULL, definition TEXT NOT NULL);
CREATE TABLE crossrefs (from_id INTEGER NOT NULL, to_start INTEGER NOT NULL, to_end INTEGER NOT NULL, votes INTEGER NOT NULL);
`);

// ── Übersetzungen (eBible, Vers pro Zeile) ───────────────────────────────────
const insertVerse = db.prepare("INSERT INTO verses (tr, id, text) VALUES (?, ?, ?)");
const insertTr = db.prepare("INSERT INTO translations (id, name, short, lang, license, notice, sort, verses) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
for (const [sort, t] of TRANSLATIONS.entries()) {
  const zip = await JSZip.loadAsync(await fetchCached(`https://ebible.org/Scriptures/${t.ebible}_vpl.zip`, `${t.ebible}_vpl.zip`));
  const about = await zip.file(`${t.ebible}_about.htm`)?.async("string");
  // Lizenz im Paket muss zur hinterlegten passen (Schutz gegen stille Lizenzänderungen).
  const expect = { gemeinfrei: /public domain|Public Domain|copyright status/i, "CC BY 4.0": /Creative Commons Attribution license 4\.0/, "CC BY-NC-ND 4.0": /Attribution-Noncommercial-No Derivatives license 4\.0/ }[t.license];
  if (t.license !== "gemeinfrei" && !expect.test(about ?? "")) throw new Error(`${t.id}: Lizenztext im Paket passt nicht mehr zu „${t.license}“ – bitte prüfen`);
  const lines = (await zip.file(`${t.ebible}_vpl.txt`).async("string")).split(/\r?\n/);
  let n = 0;
  db.transaction(() => {
    for (const line of lines) {
      const m = /^([1-3]?[A-Z]{2,3}) (\d+):(\d+) (.*)$/.exec(line);
      if (!m) continue;
      const book = VPL_BOOKS.indexOf(m[1]) + 1;
      const text = m[4].trim();
      if (!book || !text) continue;
      insertVerse.run(t.id, id(book, Number(m[2]), Number(m[3])), text.normalize("NFC"));
      n++;
    }
  })();
  if (n < 31000) throw new Error(`${t.id}: nur ${n} Verse – Paket unvollständig?`);
  insertTr.run(t.id, t.name, t.short, t.lang, t.license, t.notice, sort, n);
  log(t.name, n, "Verse");
}

// ── Grundtext (STEPBible TAGNT/TAHOT) ────────────────────────────────────────
const nfc = (v) => (typeof v === "string" ? v.normalize("NFC") : v);
const insertWordRaw = db.prepare("INSERT INTO words (verse, pos, lang, surface, translit, gloss, strong, estrong, grammar, lemma, variant) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
// Unicode vereinheitlichen (z. B. griechisch Oxia/Tonos), sonst sind gleich aussehende Wörter verschieden.
const insertWord = { run: (...a) => insertWordRaw.run(...a.map(nfc)) };
const REF = /^([1-3]?[A-Z][a-z]{1,2})\.(\d+)\.(\d+)(?:\([^)]*\))?#(\d+)=(\S+)$/;
const shortStrong = (s) => s.replace(/^([GH])0*(\d+).*$/, "$1$2"); // "H0430G" → "H430"
const stepBook = (abbr) => STEP_BOOKS.indexOf(abbr) + 1;

let greek = 0;
for (const f of STEP_FILES.tagnt) {
  const text = (await fetchCached(f.url, f.file)).toString("utf8");
  db.transaction(() => {
    for (const line of text.split("\n")) {
      const cols = line.split("\t");
      const m = REF.exec(cols[0] ?? "");
      if (!m || cols.length < 6) continue;
      const book = stepBook(m[1]);
      if (!book) continue;
      const [, surface = cols[1], translit = ""] = /^(.*?)\s*\((.*)\)\s*$/.exec(cols[1]) ?? [];
      const [estrong, grammar = ""] = cols[3].split("=");
      const [lemma = "", gloss = ""] = cols[4].split("=");
      insertWord.run(id(book, +m[2], +m[3]), +m[4], "grc", surface.trim(), translit.trim(), (cols[2] || gloss).trim(), shortStrong(estrong), estrong.trim(), grammar.trim(), lemma.trim(), m[5].includes("N") ? 0 : 1);
      greek++;
    }
  })();
}
log("Griechisch:", greek, "Wörter");

let hebrew = 0;
for (const f of STEP_FILES.tahot) {
  const text = (await fetchCached(f.url, f.file)).toString("utf8");
  db.transaction(() => {
    for (const line of text.split("\n")) {
      const cols = line.split("\t");
      const m = REF.exec(cols[0] ?? "");
      if (!m || cols.length < 6) continue;
      const book = stepBook(m[1]);
      if (!book) continue;
      // Hauptwort steht in {…}, davor/danach Präfixe/Suffixe (H9001 …)
      const braced = /\{(H\d+[A-Za-z]?)\}/.exec(cols[4])?.[1] ?? cols[4].split("/").map((s) => s.replace(/[{}]/g, "")).filter((s) => /^H\d/.test(s) && !/^H9\d{3}/.test(s)).pop() ?? "";
      const lemma = new RegExp(`${braced}=([^=}]+)=`).exec(cols[11] ?? "")?.[1] ?? "";
      insertWord.run(id(book, +m[2], +m[3]), +m[4], "hbo", cols[1].replace(/[\/\\]/g, "").trim(), cols[2].replace(/[\/\\]/g, "").trim(), cols[3].replace(/\//g, " ").replace(/\s+/g, " ").trim(), braced ? shortStrong(braced) : "", braced, cols[5].trim(), lemma.trim(), m[5].includes("L") ? 0 : 1);
      hebrew++;
    }
  })();
}
log("Hebräisch:", hebrew, "Wörter");

// ── Lexika (STEPBible TBESG/TBESH) ───────────────────────────────────────────
const cleanDef = (s) =>
  s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<ref='[^']*'>([^<]*)<\/ref>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/__/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
const insertLexRaw = db.prepare("INSERT OR IGNORE INTO lexicon (estrong, strong, lemma, translit, morph, gloss, definition) VALUES (?, ?, ?, ?, ?, ?, ?)");
const insertLex = { run: (...a) => insertLexRaw.run(...a.map(nfc)) };
let lex = 0;
for (const f of STEP_FILES.lexicon) {
  const text = (await fetchCached(f.url, f.file)).toString("utf8");
  db.transaction(() => {
    for (const line of text.split("\n")) {
      const cols = line.split("\t");
      if (!/^[GH]\d{4}/.test(cols[0] ?? "") || cols.length < 8) continue;
      const estrong = cols[1].split(" ")[0].trim();
      if (insertLex.run(estrong, shortStrong(estrong), cols[3].trim(), cols[4].trim(), cols[5].trim(), cols[6].trim(), cleanDef(cols[7])).changes) lex++;
    }
  })();
}
log("Lexikon:", lex, "Einträge");

// ── Querverweise (OpenBible) ─────────────────────────────────────────────────
const osis = (ref) => {
  const m = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/.exec(ref);
  const b = m ? OSIS_BOOKS.indexOf(m[1]) + 1 : 0;
  return b ? id(b, +m[2], +m[3]) : 0;
};
const crossZip = await JSZip.loadAsync(await fetchCached(CROSSREFS.url, CROSSREFS.file));
const crossText = await crossZip.file("cross_references.txt").async("string");
const insertCross = db.prepare("INSERT INTO crossrefs (from_id, to_start, to_end, votes) VALUES (?, ?, ?, ?)");
let cross = 0;
db.transaction(() => {
  for (const line of crossText.split("\n")) {
    const [from, to, votes] = line.split("\t");
    if (!votes || Number(votes) < 1) continue; // umstrittene (negativ bewertete) Verweise weglassen
    const [a, b = a] = to.split("-");
    const f = osis(from);
    const s = osis(a);
    const e = osis(b);
    if (f && s && e) {
      insertCross.run(f, s, e, Number(votes));
      cross++;
    }
  }
})();
log("Querverweise:", cross);

// ── Indizes, Volltext, Metadaten ─────────────────────────────────────────────
db.exec(`
CREATE UNIQUE INDEX verses_tr_id ON verses (tr, id);
CREATE INDEX verses_id ON verses (id);
CREATE INDEX words_verse ON words (verse, pos);
CREATE INDEX words_strong ON words (strong);
CREATE INDEX crossrefs_from ON crossrefs (from_id, votes DESC);
CREATE VIRTUAL TABLE verses_fts USING fts5(text, content='verses', content_rowid='rowid', tokenize="unicode61 remove_diacritics 2");
INSERT INTO verses_fts (verses_fts) VALUES ('rebuild');
`);
const meta = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
meta.run("built_at", new Date().toISOString());
meta.run("step_commit", STEP_COMMIT);
meta.run("sha256", JSON.stringify(hashes));
meta.run("notices", JSON.stringify(EXTRA_NOTICES));
db.exec("ANALYZE; VACUUM;");
db.close();
renameSync(tmp, OUT);
log("fertig:", OUT, `${(readFileSync(OUT).length / 1e6).toFixed(1)} MB`);
