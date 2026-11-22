import { describe, expect, it } from "vitest";
import { parseFileName } from "./filename";

const pick = (p: string) => {
  const m = parseFileName(p);
  return { title: m.title, type: m.type, heldOn: m.heldOn, place: m.place, mainRef: m.mainRef, occasion: m.occasion };
};

describe("Dateinamen (Muster aus dem Ordner Wortbeiträge)", () => {
  it.each([
    ["Predigten/2020-08-30 Predigt WHV (Römer 5,3-5).docx", { title: "Römer 5,3–5", type: "predigt", heldOn: "2020-08-30", place: "WHV", mainRef: "Röm 5,3–5", occasion: "Gottesdienst" }],
    ["Predigten/2019-04-21 Predigt WHV (Ostersonntag).docx", { title: "Ostersonntag", type: "predigt", heldOn: "2019-04-21", place: "WHV", mainRef: "", occasion: "Gottesdienst" }],
    ["Predigten/2014-07-13 Predigt Schneverdingen (Das Leben im Sieg).docx", { title: "Das Leben im Sieg", type: "predigt", heldOn: "2014-07-13", place: "Schneverdingen", mainRef: "", occasion: "Gottesdienst" }],
    ["Predigten/2025-09-07 Predigt WHV König Joas.docx", { title: "König Joas", type: "predigt", heldOn: "2025-09-07", place: "WHV", mainRef: "", occasion: "Gottesdienst" }],
    ["Predigten/2020-02-02 Predigt WHV (Abendmahl Römer 5,18.19).docx", { title: "Abendmahl Römer 5,18.19", type: "predigt", heldOn: "2020-02-02", place: "WHV", mainRef: "Röm 5,18", occasion: "Gottesdienst" }],
    ["Bibelstunde/2023-08-23 Bibelstunde WHV (Markus 1,1ff.)_Epilog zum Markusevangelium.docx", { title: "Epilog zum Markusevangelium", type: "bibelstudie", heldOn: "2023-08-23", place: "WHV", mainRef: "Mk 1", occasion: "Bibelstunde" }],
    ["Bibelstunde/2020-09-30 Bibelstunde WHV (Johannes 21.1ff.).docx", { title: "Johannes 21", type: "bibelstudie", heldOn: "2020-09-30", place: "WHV", mainRef: "Joh 21", occasion: "Bibelstunde" }],
    ["Bibelstunde/2023-05-31 Bibelstunde WHV (Eph. 5,21ff.).docx", { title: "Epheser 5,21ff", type: "bibelstudie", heldOn: "2023-05-31", place: "WHV", mainRef: "Eph 5,21ff", occasion: "Bibelstunde" }],
    ["Bibelstunde/2012-04-12 Bibelstunde WHV Lukasevangelium.doc", { title: "Lukasevangelium", type: "bibelstudie", heldOn: "2012-04-12", place: "WHV", mainRef: "", occasion: "Bibelstunde" }],
    ["Themen/2024-10-09 Bibelstunde WHV (Markus 12,28ff. Das wichtigste Gebot).docx", { title: "Das wichtigste Gebot", type: "bibelstudie", heldOn: "2024-10-09", place: "WHV", mainRef: "Mk 12,28ff", occasion: "Bibelstunde" }],
    ["Themen/2026-11-15 Predigt Stade (Markus 12,28ff. Das wichtigste Gebot).docx", { title: "Das wichtigste Gebot", type: "predigt", heldOn: "2026-11-15", place: "Stade", mainRef: "Mk 12,28ff", occasion: "Gottesdienst" }],
    ["Gebetsstunden/2006-04-15 Gebetsstunde Alsweder Landstr. (Vergebung).doc", { title: "Vergebung", type: "andacht", heldOn: "2006-04-15", place: "Alsweder Landstr.", mainRef: "", occasion: "Gebetsstunde" }],
    ["Gebetsstunden/2004-06-05 Gebetsstunde.doc", { title: "2004-06-05 Gebetsstunde", type: "andacht", heldOn: "2004-06-05", place: "", mainRef: "", occasion: "Gebetsstunde" }],
    ["Einleitungen/2018-01-20 Einleitung WHV Evangelisation (1.Samuel 3,10).docx", { title: "1. Samuel 3,10", type: "andacht", heldOn: "2018-01-20", place: "WHV", mainRef: "1Sam 3,10", occasion: "Einleitung" }],
    ["Sonstige Predigten/2019-05-18 Schlusswort Hochzeit (Timon und Julia).docx", { title: "Timon und Julia", type: "predigt", heldOn: "2019-05-18", place: "", mainRef: "", occasion: "Hochzeit" }],
    ["Sonstige Predigten/2012-05-16 Jug_St (Hebr. 3,7-12 Verstockung).doc", { title: "Verstockung", type: "vortrag", heldOn: "2012-05-16", place: "", mainRef: "Hebr 3,7–12", occasion: "Jugendstunde" }],
    ["Themen/2021-06-26 Thema_Gott offenbart sich im Wort_Johannes 14,6.docx", { title: "Gott offenbart sich im Wort", type: "vortrag", heldOn: "2021-06-26", place: "", mainRef: "Joh 14,6", occasion: "" }],
    ["Themen/2026 Thema_Berg des Gebets (PP).pptx", { title: "Berg des Gebets", type: "vortrag", heldOn: null, place: "", mainRef: "", occasion: "" }],
    ["Gedichte/Gedicht_Das Wort Gottes.rtf", { title: "Das Wort Gottes", type: "notiz", heldOn: null, place: "", mainRef: "", occasion: "Gedicht" }],
    ["Gedichte/Abendmahl.doc", { title: "Abendmahl", type: "notiz", heldOn: null, place: "", mainRef: "", occasion: "" }],
  ])("%s", (path, expected) => {
    expect(pick(path)).toEqual(expected);
  });

  it.each([
    ["Bibelstunde/2017-01-11 Bibelstunde WHV Könige Israels (König Saul).docx", { place: "WHV", series: "Könige Israels", title: "König Saul" }],
    ["Themen/Grenzen/2015-03-04 Bibelstunde Grenzen im Leben des Gläubigen (Teil 1).docx", { place: "", series: "Grenzen im Leben des Gläubigen", title: "Teil 1" }],
    ["Gebetsstunden/2015-02-06 Gebetsstunde (Röm12,1_2).docm", { place: "", series: "", title: "Römer 12,1–2" }],
    ["Sonstige Predigten/2019-11-30 Jugendtag Hamburg (Lukas 22,54ff.ff.).docx", { place: "", series: "", title: "Jugendtag Hamburg" }],
    ["Sonstige Predigten/2004-08-25 Mittwoch, (Gruppe) (Ein Gott der Wunder tut).doc", { place: "", series: "", title: "Mittwoch, (Gruppe) (Ein Gott der Wunder tut)" }],
    ["Gebetsstunden/2005-11-05 Gebetsstunde Kastanienweg (Gott der Arzt.doc", { place: "Kastanienweg", series: "", title: "Gott der Arzt" }],
    ["Themen/Thema Berg der Rettung - Ararat (Kinderfreizeit 2018.docx", { place: "", series: "", title: "Berg der Rettung - Ararat (Kinderfreizeit 2018)" }],
    ["Predigten/2010-05-02 2te Predigt Kast. (Gnade).doc", { place: "Kast.", series: "", title: "Gnade" }],
    ["Sonstige Predigten/2025-10-11 Hochzeit Titus und Laurena (Das Dankamt).docx", { place: "", series: "", title: "Das Dankamt (Titus und Laurena)" }],
    ["Sonstige Predigten/2019-05-18 Schlusswort Hochzeit (Timon und Julia).docx", { place: "", series: "", title: "Timon und Julia" }],
  ])("Sonderfall: %s", (path, expected) => {
    const m = parseFileName(path);
    expect({ place: m.place, series: m.series, title: m.title }).toEqual(expected);
  });

  it("Tippfehler im Datum und Reste wie 'ff' landen nicht im Titel", () => {
    expect(parseFileName("Bibelstunde/2024-0-21 Bibelstunde WHV (Markus 11,14ff.).docx")).toMatchObject({ heldOn: null, title: "Markus 11,14ff", mainRef: "Mk 11,14ff" });
    expect(parseFileName("Predigten/2019-07-xx Predigt MOLDAWIEN (Wachet).docx")).toMatchObject({ heldOn: null, title: "Wachet", place: "MOLDAWIEN" });
    expect(parseFileName("Predigten/2026-10-14 Bibelstunde WHV (1.Tim3ff).docx").title).toBe("1. Timotheus 3");
  });

  it("Bibelstelle aus der Klammer wird Haupttext", () => {
    expect(parseFileName("Sonstige Predigten/2019-11-30 Jugendtag Hamburg (Lukas 22,54ff.ff.).docx").mainRef).toBe("Lk 22,54ff");
    expect(parseFileName("Einleitungen/2018-01-20 Einleitung WHV Evangelisation (1.Samuel 3,10).docx").series).toBe("Evangelisation");
  });

  it("leere Klammer oder nur Ort: Titel wird später aus dem Dokument genommen", () => {
    for (const p of ["Gebetsstunden/2016-12-21 Gebetsstunde WHV ().docx", "Gebetsstunden/2025-03-07 Gebetsstunde WHV .docx", "Gebetsstunden/2004-06-05 Gebetsstunde.doc"]) {
      const m = parseFileName(p);
      expect(m.titleGuessed, p).toBe(true);
      expect(m.title, p).not.toMatch(/\(\)/);
    }
    expect(parseFileName("Gebetsstunden/2025-03-07 Gebetsstunde WHV .docx").place).toBe("WHV");
    expect(parseFileName("Predigten/2019-04-21 Predigt WHV (Ostersonntag).docx").titleGuessed).toBe(false);
  });

  it("Status, Reihe und Themen aus Ordnern", () => {
    const bs = parseFileName("Bibelstunde/2024-01-17 Bibelstunde WHV (Markus 4,35ff.)_Kleinglaube.docx");
    expect(bs.status).toBe("gehalten");
    expect(bs.series).toBe("Bibelstunde Markus");
    expect(parseFileName("Themen/Gebet/Beten lernen.docx").topics).toEqual(["Gebet"]);
    expect(parseFileName("Themen/Buße_Bekehrung_Wiedergeburt/x.docx").topics).toEqual(["Buße, Bekehrung, Wiedergeburt"]);
    expect(parseFileName("Predigten/2020-01-01 Predigt WHV (Neujahr).docx").topics).toEqual([]);
    expect(parseFileName("Reserve_unfertige Predigten/Gnade.docx").status).toBe("entwurf");
    expect(parseFileName("Gedichte/Abendmahl.doc").status).toBe("fertig");
  });
});
