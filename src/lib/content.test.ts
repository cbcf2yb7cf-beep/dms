import { describe, expect, it } from "vitest";
import { blockReferences, isDoc, outline, plainText, sermonTemplate, wordCount, type JSONNode } from "./content";

const doc: JSONNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "1. Was ist Glaube?" }] },
    { type: "paragraph", content: [{ type: "text", text: "Der Glaube " }, { type: "text", text: "trägt", marks: [{ type: "bold" }] }, { type: "text", text: "." }] },
    {
      type: "bibleBlock",
      attrs: { reference: "Hebr 11,1", translation: "Elberfelder 1905" },
      content: [{ type: "paragraph", content: [{ type: "text", text: "Der Glaube aber ist eine Verwirklichung dessen, was man hofft." }] }],
    },
    { type: "note", content: [{ type: "paragraph", content: [{ type: "text", text: "Beispiel Fundament" }] }] },
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Anwendung" }] },
  ],
};

describe("Inhalt auswerten", () => {
  it("plainText trennt Blöcke und nimmt die Stellenangabe des Bibel-Blocks mit", () => {
    const text = plainText(doc);
    expect(text).toContain("1. Was ist Glaube?\nDer Glaube trägt.");
    expect(text).toContain("Hebr 11,1\nDer Glaube aber ist");
    expect(text.endsWith("Anwendung")).toBe(true);
  });

  it("wordCount zählt Wörter mit Umlauten und Bindestrich", () => {
    expect(wordCount("Gnade über Gnade – Jesu Christi Heils-Botschaft")).toBe(6);
    expect(wordCount("")).toBe(0);
  });

  it("blockReferences liest Bibelstellen-Blöcke", () => {
    expect(blockReferences(doc)).toEqual(["Hebr 11,1"]);
  });

  it("outline liefert Überschriften mit Ebene", () => {
    expect(outline(doc)).toEqual([
      { level: 2, text: "1. Was ist Glaube?", index: 0 },
      { level: 3, text: "Anwendung", index: 1 },
    ]);
  });

  it("Vorlage für Predigten hat Einleitung, Hauptteil, Schluss", () => {
    expect(outline(sermonTemplate()).map((o) => o.text)).toEqual(["Einleitung", "Hauptteil", "Schluss"]);
  });

  it("isDoc", () => {
    expect(isDoc(doc)).toBe(true);
    expect(isDoc({ type: "paragraph" })).toBe(false);
    expect(isDoc(null)).toBe(false);
  });
});
