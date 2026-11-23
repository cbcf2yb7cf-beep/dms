import { describe, expect, it } from "vitest";
import { parseQuery, parseQuestion, snippet, stem, stemText } from "./stem";

describe("Wortstämme", () => {
  it("fasst Wortformen zusammen", () => {
    expect(stem("Vergebung")).toBe(stem("vergeben"));
    expect(stem("Glaube")).toBe(stem("glauben"));
    expect(stem("Kindern")).toBe(stem("Kinder"));
    expect(stemText("Die Häuser, 2024!")).toBe("die haus 2024");
  });

  it("Suchanfrage: Wörter als Wortanfang, Wortfolge in Anführungszeichen, Ausschluss mit -", () => {
    expect(parseQuery("Vergebung Gnade")?.fts).toBe('("vergeb"*) AND ("gnad"*)');
    expect(parseQuery('"Licht der Welt"')?.fts).toBe('("licht der welt")');
    expect(parseQuery("Glaube -Werke")?.fts).toBe('("glaub"*) NOT ("werk"*)');
    expect(parseQuery("-nur")).toBeNull();
    expect(parseQuery('" OR 1=1 --')?.fts).toBe('("or"*) AND ("1"* AND "1"*)'); // jedes Wort einzeln gequotet: kein Ausbruch aus der Suchsprache
  });

  it("Fragen: Füllwörter weg, ein Begriff genügt", () => {
    expect(parseQuestion("Was habe ich über Vergebung gesagt?")?.fts).toBe('"vergeb"*');
    expect(parseQuestion("Gnade und Glaube bei Paulus")?.fts).toBe('"gnad"* OR "glaub"* OR "paulus"*');
    expect(parseQuestion("was ist das?")).toBeNull();
  });

  it("Textausschnitt markiert alle Formen", () => {
    const s = snippet("Wer vergibt, dem wird vergeben. Die Vergebung ist ein Geschenk.", ["vergeb"])!;
    expect(s).toContain("\u0001vergeben\u0002");
    expect(s).toContain("\u0001Vergebung\u0002");
    expect(snippet("nichts", ["vergeb"])).toBeNull();
  });
});
