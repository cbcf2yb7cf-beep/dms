import { beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { createDocument, saveDocument } from "./documents";
import { createFromDocument, createPresentation, duplicatePresentation, getPresentation, listPresentations, mediaDir, savePresentation, storeImage } from "./presentations";
import { buildPptx } from "./slides/pptx";
import { emptySlide } from "./slides/types";

beforeAll(() => {
  process.env.DMS_DATA_DIR = mkdtempSync(join(tmpdir(), "dms-praes-"));
});

const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));

describe("Präsentationen", () => {
  it("Entwurf aus Dokument, Speichern, Konflikt, Duplikat", () => {
    const docId = createDocument("predigt");
    saveDocument(
      docId,
      {
        title: "Die Kraft des Glaubens",
        content: { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "EINLEITUNG" }] }, { type: "bibleBlock", attrs: { reference: "Hebr 11,1", translation: "Luther 1912" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Es ist aber der Glaube …" }] }] }] },
        type: "predigt", status: "fertig", heldOn: null, occasion: "", place: "", series: "", mainRef: "Hebr 11,1", summary: "", favorite: false, topics: [], tags: [],
      },
      Date.now() + 1000,
    );
    const id = createFromDocument(docId);
    const p = getPresentation(id)!;
    expect(p.title).toBe("Die Kraft des Glaubens");
    expect(p.documentId).toBe(docId);
    expect(p.slides.map((s) => s.kind)).toEqual(["titel", "abschnitt", "bibel"]);

    const ok = savePresentation(id, { baseUpdatedAt: p.updatedAt, title: "Neu", theme: "nacht", slides: [...p.slides, emptySlide("leer")] });
    expect(ok.ok).toBe(true);
    expect(savePresentation(id, { baseUpdatedAt: p.updatedAt, title: "Alt", theme: "papier", slides: [] })).toMatchObject({ ok: false, reason: "conflict" });
    expect(getPresentation(id)).toMatchObject({ title: "Neu", theme: "nacht" });
    expect(getPresentation(id)!.slides).toHaveLength(4);

    const copy = getPresentation(duplicatePresentation(id))!;
    expect(copy.title).toBe("Neu (Kopie)");
    expect(listPresentations().some((x) => x.id === copy.id && x.slideCount === 4)).toBe(true);
  });

  it("Bilder: nur echte Bilddateien, gleiche Datei nur einmal", () => {
    const a = storeImage(PNG);
    expect(a).toMatch(/^[0-9a-f]{64}\.png$/);
    expect(storeImage(PNG)).toBe(a);
    expect(() => storeImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toThrow(/Nur PNG/);
  });

  it("PowerPoint-Export: gültige Datei mit allen Folien, Notizen und Bild", async () => {
    const image = storeImage(PNG);
    const id = createPresentation({
      title: "Export",
      theme: "papier",
      slides: [
        { ...emptySlide("titel"), title: "Titel", subtitle: "Untertitel", notes: "Begrüßung" } as never,
        { ...emptySlide("punkte"), title: "Punkte", points: ["Eins", "Zwei"] } as never,
        { ...emptySlide("bibel"), reference: "Joh 3,16", translation: "Luther 1912", text: "Also hat Gott die Welt geliebt …" } as never,
        { ...emptySlide("bild"), image, caption: "Bild" } as never,
        emptySlide("leer"),
      ],
    });
    const buf = await buildPptx(getPresentation(id)!, mediaDir());
    const zip = await JSZip.loadAsync(buf);
    const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slides).toHaveLength(5);
    const all = (await Promise.all(slides.map((f) => zip.file(f)!.async("string")))).join("");
    expect(all).toContain("Also hat Gott die Welt geliebt");
    expect(all).toContain("Zwei");
    expect(Object.keys(zip.files).some((f) => f.startsWith("ppt/media/"))).toBe(true);
    const notes = (await Promise.all(Object.keys(zip.files).filter((f) => f.startsWith("ppt/notesSlides/notesSlide")).map((f) => zip.file(f)!.async("string")))).join("");
    expect(notes).toContain("Begrüßung");
  });
});
