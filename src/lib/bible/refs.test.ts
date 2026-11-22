import { describe, expect, it } from "vitest";
import { formatRef, parseRef, parseRefs, verseId, overlaps, END_VERSE } from "./refs";

const labels = (text: string) => parseRefs(text).map((r) => formatRef(r));

describe("parseRefs – deutsche Schreibweisen", () => {
  it.each([
    ["Hebr 11,1", "Hebr 11,1"],
    ["Hebr. 11,1-3", "Hebr 11,1–3"],
    ["Hebräer 11,1–6", "Hebr 11,1–6"],
    ["Joh 3,16", "Joh 3,16"],
    ["Johannes 3,16f", "Joh 3,16–17"],
    ["Röm 8,28ff", "Röm 8,28ff"],
    ["Römer 8", "Röm 8"],
    ["Roemer 8,1", "Röm 8,1"],
    ["Ps 23", "Ps 23"],
    ["Psalm 119,105", "Ps 119,105"],
    ["1. Mose 1,1", "1Mo 1,1"],
    ["1Mo 12,1-3", "1Mo 12,1–3"],
    ["2. Mose 20", "2Mo 20"],
    ["1. Kor 13", "1Kor 13"],
    ["1Kor 13,4-7", "1Kor 13,4–7"],
    ["1 Kor 15,55", "1Kor 15,55"],
    ["2. Kön 5,14", "2Kön 5,14"],
    ["1. Johannes 4,8", "1Joh 4,8"],
    ["Apg 2,42", "Apg 2,42"],
    ["Offb 21,1-4", "Offb 21,1–4"],
    ["Mt 5-7", "Mt 5–7"],
    ["Mt 5,3–7,29", "Mt 5,3–7,29"],
    ["Mt 5,3 bis 12", "Mt 5,3–12"],
    ["Jes 40,31", "Jes 40,31"],
    ["Am 5,24", "Am 5,24"],
    ["Jud 3", "Jud 3"],
    ["Phlm 1,10", "Phlm 10"],
    ["Hld 8,6", "Hld 8,6"],
  ])("%s → %s", (input, expected) => {
    expect(labels(input)).toEqual([expected]);
  });
});

describe("parseRefs – englische Schreibweisen", () => {
  it.each([
    ["John 3:16", "Joh 3,16"],
    ["Romans 8:28", "Röm 8,28"],
    ["1 John 4:8", "1Joh 4,8"],
    ["Genesis 1:1-3", "1Mo 1,1–3"],
    ["Rev 22:20", "Offb 22,20"],
    ["Matthew 5", "Mt 5"],
  ])("%s → %s", (input, expected) => {
    expect(labels(input)).toEqual([expected]);
  });
});

describe("parseRefs – mehrere Stellen", () => {
  it("Semikolon: weiteres Kapitel desselben Buchs", () => {
    expect(labels("Hebr 11,1-3; 12,1f")).toEqual(["Hebr 11,1–3", "Hebr 12,1–2"]);
  });

  it("Semikolon: neues Buch", () => {
    expect(labels("Röm 8,1; 1Kor 13")).toEqual(["Röm 8,1", "1Kor 13"]);
  });

  it("Punkt: weitere Verse im selben Kapitel", () => {
    expect(labels("Joh 3,16.18")).toEqual(["Joh 3,16", "Joh 3,18"]);
    expect(labels("Röm 8,1.28-30")).toEqual(["Röm 8,1", "Röm 8,28–30"]);
  });

  it("im Fließtext", () => {
    const text = "Wie Paulus in Röm 5,8 schreibt und Jesus in Joh 15,13 sagt – vgl. auch 1. Joh 4,10.";
    expect(labels(text)).toEqual(["Röm 5,8", "Joh 15,13", "1Joh 4,10"]);
  });

  it("ohne Duplikate", () => {
    expect(labels("Joh 3,16 … nochmal Joh 3,16")).toEqual(["Joh 3,16"]);
  });
});

describe("parseRefs – keine Bibelstellen", () => {
  it.each([
    "am 5. Mai treffen wir uns",
    "Am 24. Dezember",
    "Mal 3 Wochen warten",
    "Hab 2 Kinder",
    "Seite 12, Absatz 3",
    "Kapitel 3,5",
    "Mt 29,1", // Matthäus hat nur 28 Kapitel
    "Röm 0,1",
    "Ps 151",
    "Joh 3,16 für alle", // "f" von "für" ist kein "f."-Zusatz
  ])("%s", (text) => {
    const found = labels(text);
    if (text.startsWith("Joh")) expect(found).toEqual(["Joh 3,16"]);
    else expect(found).toEqual([]);
  });
});

describe("Zahlen und Bereiche", () => {
  it("verseId codiert BBCCCVVV", () => {
    expect(verseId(45, 8, 28)).toBe(45_008_028);
  });

  it("ganzes Kapitel überlappt mit einzelnem Vers", () => {
    const chapter = parseRef("Röm 8")!;
    expect(chapter.start).toBe(verseId(45, 8, 1));
    expect(chapter.end).toBe(verseId(45, 8, END_VERSE));
    expect(overlaps(chapter, parseRef("Röm 8,28")!)).toBe(true);
    expect(overlaps(chapter, parseRef("Röm 9,1")!)).toBe(false);
  });

  it("formatRef mit vollem Namen", () => {
    expect(formatRef(parseRef("1Kor 13")!, "name")).toBe("1. Korinther 13");
  });
});
