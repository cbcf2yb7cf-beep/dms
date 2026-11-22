import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Prüft die echte bible.db (wird von scripts/bible/build.mjs erzeugt). Ohne Datei übersprungen.
const path = resolve("data/bible.db");
process.env.BIBLE_PATH = path;
const has = existsSync(path);

describe.skipIf(!has)("Bibeldaten", async () => {
  const db = await import("./db");
  const { parseRef } = await import("./refs");

  it("acht Übersetzungen, Luther als Standard", () => {
    expect(db.translations().map((t) => t.id)).toEqual(["luther1912", "elberfelder1905", "schlachter1951", "elberfelder-bk", "textbibel1906", "kjv", "bsb", "web"]);
    expect(db.validTranslations(["unbekannt"])).toEqual(["luther1912"]);
    expect(db.validTranslations(["kjv", "kjv", "bsb", "web", "luther1912"])).toEqual(["kjv", "bsb", "web"]);
  });

  it("Text für Bibel-Blöcke: ein Vers ohne Nummer, mehrere mit Nummern", () => {
    expect(db.textForRef("luther1912", parseRef("Joh 3,16")!)).toMatch(/^Also hat Gott die Welt geliebt/);
    const two = db.textForRef("schlachter1951", parseRef("Hebr 11,1-2")!);
    expect(two).toMatch(/^1 Es ist aber der Glaube .* 2 /);
  });

  it("Kapitel parallel", () => {
    const rows = db.chapter(["luther1912", "kjv"], 19, 23);
    expect(rows).toHaveLength(6);
    expect(rows[0].texts.luther1912).toMatch(/Der HERR ist mein Hirte/);
    expect(rows[0].texts.kjv).toMatch(/The LORD \[is\] my shepherd/); // KJV: ergänzte Wörter in [ ]
  });

  it("Grundtext, Lexikon (auch erweiterte Nummern), Vorkommen", () => {
    const w = db.words(58_011_001).filter((x) => !x.variant);
    expect(w.map((x) => x.strong)).toContain("G4102");
    expect(db.lexicon("G4102")?.lemma).toBe("πίστις");
    expect(db.lexicon("H430")?.translit).toMatch(/lo/);
    expect(db.lexicon("G3700G")).toBeDefined(); // Rückgriff auf Grundnummer
    expect(db.strongOccurrences("G5485").total).toBeGreaterThan(140);
  });

  it("Konkordanz: Wort, Wortanfang, Wortgruppe, sichere Abfrage", () => {
    const word = db.concordance("Gnade", "luther1912", "wort");
    const prefix = db.concordance("gnade", "luther1912", "anfang");
    expect(word.total).toBeGreaterThan(200);
    expect(prefix.total).toBeGreaterThan(word.total);
    expect(word.results[0].text).toContain(db.HIT_START);
    expect(db.concordance("Licht der Welt", "luther1912", "gruppe").total).toBeGreaterThanOrEqual(1);
    expect(db.ftsQuery('a" OR 1=1 --', "wort")).toBe('"a" AND "OR" AND "1" AND "1"');
    expect(db.concordance("Gnade", "luther1912", "wort", { book: 45 }).total).toBeLessThan(word.total);
  });

  it("Querverweise sortiert nach Bewertung", () => {
    const refs = db.crossrefs(45_008_028, 3);
    expect(refs).toHaveLength(3);
    expect(refs[0].votes).toBeGreaterThanOrEqual(refs[1].votes);
  });
});
