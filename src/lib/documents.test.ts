import { describe, expect, it } from "vitest";
import {
  createDocument,
  duplicateDocument,
  getDocument,
  listDocuments,
  listVersions,
  moveToTrash,
  restoreFromTrash,
  restoreVersion,
  saveDocument,
  topicCounts,
  type SaveInput,
} from "./documents";
import type { JSONNode } from "./content";

const para = (text: string): JSONNode => ({ type: "paragraph", content: [{ type: "text", text }] });
const input = (over: Partial<SaveInput> = {}): SaveInput => ({
  title: "Die Kraft des Glaubens",
  content: {
    type: "doc",
    content: [
      para("Paulus schreibt in Röm 8,28 von Gottes Plan."),
      { type: "bibleBlock", attrs: { reference: "Jak 2,17", translation: "Luther 1912" }, content: [para("Also auch der Glaube …")] },
    ],
  },
  type: "predigt",
  status: "entwurf",
  heldOn: "2026-11-09",
  occasion: "Gottesdienst",
  place: "",
  series: "Hebräerbrief",
  mainRef: "Hebr 11,1-6",
  summary: "",
  favorite: false,
  topics: ["Glaube", "glaube", " Hoffnung "],
  tags: ["Advent"],
  ...over,
});

describe("Dokumente", () => {
  it("speichert Inhalt, Themen und erkennt Bibelstellen aus Haupttext, Block und Text", () => {
    const id = createDocument("predigt");
    const doc = getDocument(id)!;
    expect(doc.title).toBe("");
    expect(saveDocument(id, input(), doc.updatedAt.getTime()).ok).toBe(true);

    const saved = getDocument(id)!;
    expect(saved.topics).toEqual(["Glaube", "Hoffnung"]); // ohne Doppel, getrimmt
    expect(saved.tags).toEqual(["Advent"]);
    expect(saved.wordCount).toBeGreaterThan(5);
    expect(saved.refs.map((r) => `${r.label}:${r.source}`)).toEqual(["Hebr 11,1–6:main", "Jak 2,17:block", "Röm 8,28:text"]);
  });

  it("findet Dokumente über Bibelstellen (Überlappung), Thema, Suchwort und Jahr", () => {
    const id = createDocument("predigt");
    saveDocument(id, input({ title: "Glaube und Werke" }), Date.now() + 1000);
    const titles = (f: Parameters<typeof listDocuments>[0]) => listDocuments(f).items.map((d) => d.title);

    expect(titles({ stelle: "Hebr 11" })).toContain("Glaube und Werke");
    expect(titles({ stelle: "Röm 8" })).toContain("Glaube und Werke");
    expect(titles({ stelle: "Joh 3" })).not.toContain("Glaube und Werke");
    expect(listDocuments({ stelle: "keine Stelle" }).items).toEqual([]);
    expect(titles({ topic: "glaube" })).toContain("Glaube und Werke");
    expect(titles({ q: "Gottes Plan" })).toContain("Glaube und Werke");
    expect(titles({ q: "100%" })).toEqual([]); // LIKE-Platzhalter werden escaped
    expect(titles({ year: "2026" })).toContain("Glaube und Werke");
    expect(topicCounts().find((t) => t.name === "Glaube")?.n).toBeGreaterThanOrEqual(2);
  });

  it("überschreibt keinen neueren Stand (Konflikt)", () => {
    const id = createDocument("notiz");
    const base = getDocument(id)!.updatedAt.getTime();
    expect(saveDocument(id, input(), base + 10_000).ok).toBe(true);
    const stale = saveDocument(id, input({ title: "Alt" }), base);
    expect(stale).toMatchObject({ ok: false, reason: "conflict" });
    expect(getDocument(id)!.title).toBe("Die Kraft des Glaubens");
  });

  it("legt Versionen an: automatisch höchstens alle 5 Minuten, manuell immer, Wiederherstellen sichert vorher", () => {
    const id = createDocument("predigt");
    const far = Date.now() + 60_000;
    saveDocument(id, input({ title: "Fassung 1" }), far);
    saveDocument(id, input({ title: "Fassung 2" }), far);
    expect(listVersions(id).map((v) => v.reason)).toEqual(["auto"]);
    saveDocument(id, input({ title: "Fassung 3" }), far, { manualVersion: true });
    const versions = listVersions(id);
    expect(versions.map((v) => v.title)).toEqual(["Fassung 3", "Fassung 1"]);

    restoreVersion(id, versions[1].id);
    expect(getDocument(id)!.title).toBe("Fassung 1");
    expect(listVersions(id)[0].reason).toBe("wiederhergestellt");
  });

  it("Papierkorb blendet aus und stellt wieder her; Duplikat übernimmt Themen", () => {
    const id = createDocument("vortrag");
    saveDocument(id, input({ title: "Papierkorb-Test", type: "vortrag" }), Date.now() + 1000);
    moveToTrash(id);
    expect(listDocuments({}).items.some((d) => d.id === id)).toBe(false);
    expect(listDocuments({ view: "papierkorb" }).items.some((d) => d.id === id)).toBe(true);
    expect(saveDocument(id, input(), Date.now() + 5000)).toMatchObject({ ok: false, reason: "missing" });
    restoreFromTrash(id);

    const copy = getDocument(duplicateDocument(id))!;
    expect(copy.title).toBe("Papierkorb-Test (Kopie)");
    expect(copy.status).toBe("entwurf");
    expect(copy.topics).toEqual(["Glaube", "Hoffnung"]);
  });
});
