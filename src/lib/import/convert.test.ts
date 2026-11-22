import { describe, expect, it } from "vitest";
import { htmlToDoc } from "./html";
import { textToDoc } from "./plaintext";
import { rtfToText } from "./rtf";
import { pptxToDoc } from "./pptx";
import { finalizeContent } from "./finalize";
import { parseFileName } from "./filename";
import { planImport } from "./formats";
import { extract } from "./extract";
import { makeDocx, makePptx } from "./testfiles";
import { outline, plainText, type JSONNode } from "@/lib/content";

const types = (d: JSONNode) => (d.content ?? []).map((n) => (n.type === "heading" ? `h${n.attrs?.level}` : n.type));

describe("Word (HTML aus mammoth)", () => {
  it("kurzer Fettdruck wird Überschrift, Großbuchstaben = Ebene 2", () => {
    const d = htmlToDoc("<p><strong>EINLEITUNG</strong></p><p>Liebe Geschwister,</p><p><strong>Text: Römer 5,18.19</strong></p><p>Ein <strong>fetter</strong> und <em>kursiver</em> Satz.</p>");
    expect(types(d)).toEqual(["h2", "paragraph", "h3", "paragraph"]);
    expect(d.content?.[3].content?.map((n) => n.marks?.[0]?.type ?? null)).toEqual([null, "bold", null, "italic", null]);
  });

  it("langer fetter Satz bleibt Absatz", () => {
    expect(types(htmlToDoc("<p><strong>Das ist ein ganz normaler, fett geschriebener Satz mit Punkt am Ende.</strong></p>"))).toEqual(["paragraph"]);
  });

  it("Listen, Zitate, Tabellen, Zeilenumbrüche", () => {
    const d = htmlToDoc("<ol><li>Eins</li><li>Zwei<ul><li>Unterpunkt</li></ul></li></ol><blockquote><p>Zitat</p></blockquote><table><tr><td>A</td><td>B</td></tr></table><p>Zeile<br/>zwei</p>");
    expect(types(d)).toEqual(["orderedList", "blockquote", "paragraph", "paragraph"]);
    expect(plainText(d)).toContain("A · B");
    expect(d.content?.[3].content?.map((n) => n.type)).toEqual(["text", "hardBreak", "text"]);
  });

  it("echte DOCX-Datei über mammoth", async () => {
    const bytes = await makeDocx(["**2014-07-13 Predigt Schneverdingen (Das Leben im Sieg)**", "**EINLEITUNG**", "Liebe Geschwister,", "**HAUPTTEIL**", "Text aus 1. Korinther 15,57."]);
    const { content } = await extract("docx", bytes);
    const meta = parseFileName("Predigten/2014-07-13 Predigt Schneverdingen (Das Leben im Sieg).docx");
    const fin = finalizeContent(content, meta);
    expect(fin.title).toBe("Das Leben im Sieg");
    expect(outline(fin.content).map((o) => o.text)).toEqual(["EINLEITUNG", "HAUPTTEIL"]); // Kopfzeile entfernt
  });
});

describe("Text (alte .doc, RTF, PDF)", () => {
  it("Gliederungszeilen und Aufzählungen", () => {
    const d = textToDoc("Einleitung:\nBeispiel vom Staffellauf\n\nHAUPTTEIL\n- erstens\n- zweitens\n1. Punkt\n2. Punkt\nNormaler Satz.");
    expect(types(d)).toEqual(["h2", "paragraph", "h2", "bulletList", "orderedList", "paragraph"]);
    expect(plainText(d)).toContain("Einleitung\nBeispiel");
  });

  it("RTF mit Umlauten, Unicode und übersprungenen Tabellen", () => {
    // Normale Zeichenkette mit maskierten Backslashes (RTF-Steuerwörter wie \u8222? müssen erhalten bleiben).
    const rtf = "{\\rtf1\\ansi{\\fonttbl{\\f0 Times;}}{\\colortbl;\\red0\\green0\\blue0;}{\\*\\generator Word;}\\f0 Der Mensch lebt nicht vom Brot allein.\\par Gr\\'fc\\'dfe \\u8222?Gottes\\u8220? Wort\\par}";
    expect(rtfToText(rtf).trim()).toBe("Der Mensch lebt nicht vom Brot allein.\nGrüße „Gottes“ Wort");
  });
});

describe("PowerPoint", () => {
  it("Folien in der richtigen Reihenfolge, Zeilenumbruch, Notizen ohne Foliennummer", async () => {
    const bytes = await makePptx([
      { paragraphs: ["Hilfen vom Text zur Predigt", "Brüderzusammenkunft"] },
      { paragraphs: ["Phase 1\nЭтап 1", "Text auswählen"], notes: "Hier Beispiel erzählen" },
    ]);
    const { content, slides } = await pptxToDoc(bytes);
    expect(slides).toBe(2);
    expect(outline(content).map((o) => o.text)).toEqual(["Folie 1 – Hilfen vom Text zur Predigt", "Folie 2 – Phase 1 Этап 1"]);
    const note = content.content?.find((n) => n.type === "note");
    expect(plainText(note!)).toBe("Hier Beispiel erzählen");
    // Erste Folie bleibt beim Aufräumen erhalten
    const fin = finalizeContent(content, parseFileName("Themen/Hilfen vom Text zur Predigt.pptx"), { keepFirst: true });
    expect(outline(fin.content)).toHaveLength(2);
  });
});

describe("Vorprüfung der Dateiliste", () => {
  it("beste Fassung je Name, Systemdateien weg, unbekannte Typen übersprungen", () => {
    const plan = planImport([
      "Sonstige/Hochzeit (Das Dankamt).doc",
      "Sonstige/Hochzeit (Das Dankamt).docx",
      "Themen/Hilfen.pptx",
      "Themen/Hilfen.pdf",
      "Themen/Hilfen-Notizen.docx",
      "Predigten/~$Ostern.docx",
      "Predigten/.DS_Store",
      "Bilder/Foto.png",
      "Predigten/Ostern.docx",
    ]);
    const act = Object.fromEntries(plan.map((p) => [p.path, p.action]));
    expect(act).toEqual({
      "Sonstige/Hochzeit (Das Dankamt).doc": "skip",
      "Sonstige/Hochzeit (Das Dankamt).docx": "import",
      "Themen/Hilfen.pptx": "import",
      "Themen/Hilfen.pdf": "skip",
      "Themen/Hilfen-Notizen.docx": "import",
      "Bilder/Foto.png": "skip",
      "Predigten/Ostern.docx": "import",
    });
  });

  it("Word und PowerPoint mit gleichem Namen werden beide übernommen", () => {
    expect(planImport(["a/Predigt.docx", "a/Predigt.pptx"]).map((p) => p.action)).toEqual(["import", "import"]);
  });
});
