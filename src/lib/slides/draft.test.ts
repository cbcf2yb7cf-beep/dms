import { describe, expect, it } from "vitest";
import { draftFromDocument } from "./draft";
import { slideSchema, fitSize, THEMES } from "./types";
import type { JSONNode } from "@/lib/content";

const t = (text: string): JSONNode => ({ type: "text", text });
const p = (text: string): JSONNode => ({ type: "paragraph", content: [t(text)] });
const h = (level: number, text: string): JSONNode => ({ type: "heading", attrs: { level }, content: [t(text)] });
const ul = (...items: string[]): JSONNode => ({ type: "bulletList", content: items.map((i) => ({ type: "listItem", content: [p(i)] })) });

describe("Folienentwurf aus einem Dokument", () => {
  it("Titel, Abschnitte, Punkte, Bibelvers, Zitat – Notizen und lange Absätze nicht", () => {
    const doc: JSONNode = {
      type: "doc",
      content: [
        h(2, "EINLEITUNG"),
        p("Liebe Geschwister, ein langer Absatz, der nicht auf eine Folie gehört."),
        { type: "bibleBlock", attrs: { reference: "Hebr 11,1", translation: "Luther 1912" }, content: [p("Es ist aber der Glaube eine gewisse Zuversicht …")] },
        h(3, "1. Was ist Glaube?"),
        ul("Vertrauen. Das ist der erste Punkt und hier kommt noch viel mehr Text.", "Gewissheit"),
        { type: "blockquote", content: [p("Glaube ist das Vertrauen auf Gott.")] },
        { type: "note", content: [p("nicht vorlesen")] },
      ],
    };
    const slides = draftFromDocument(doc, { title: "Die Kraft des Glaubens", mainRef: "Hebr 11,1-6", heldOn: "2026-11-09", place: "WHV" });
    expect(slides.map((s) => s.kind)).toEqual(["titel", "abschnitt", "bibel", "punkte", "zitat"]);
    expect(slides[0]).toMatchObject({ title: "Die Kraft des Glaubens", subtitle: "Hebr 11,1-6 · 9. November 2026 · WHV" });
    expect(slides[2]).toMatchObject({ reference: "Hebr 11,1", translation: "Luther 1912" });
    expect(slides[3]).toMatchObject({ title: "1. Was ist Glaube?", points: ["Vertrauen. Das ist der erste Punkt und hier kommt noch viel mehr Text.", "Gewissheit"] });
    for (const s of slides) expect(slideSchema.safeParse(s).success).toBe(true);
  });

  it("lange Listen werden auf mehrere Folien verteilt", () => {
    const slides = draftFromDocument({ type: "doc", content: [h(3, "Punkte"), ul(...Array.from({ length: 8 }, (_, i) => `Punkt ${i + 1}`))] }, { title: "X", mainRef: "", heldOn: null, place: "" });
    expect(slides.filter((s) => s.kind === "punkte").map((s) => (s.kind === "punkte" ? s.points.length : 0))).toEqual([6, 2]);
    expect(slides[2]).toMatchObject({ title: "Punkte (Forts.)" });
  });

  it("Schriftgröße passt sich der Textlänge an; Designs vollständig", () => {
    expect(fitSize(100, 4)).toBe(4);
    expect(fitSize(700, 4)).toBeLessThan(fitSize(300, 4));
    expect(Object.keys(THEMES)).toEqual(["papier", "anthrazit", "nacht", "klar"]);
  });
});
