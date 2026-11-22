import { beforeAll, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJob, filesForDocument, importOne, jobItems, jobSummary, storedPath, undoJob } from "./index";
import { getDocument, listDocuments } from "@/lib/documents";
import { makeDocx } from "./testfiles";

beforeAll(() => {
  process.env.DMS_DATA_DIR = mkdtempSync(join(tmpdir(), "dms-import-"));
});

describe("Import (Datenbank + Originale)", () => {
  it("legt Dokument mit Angaben aus dem Dateinamen an, speichert das Original unverändert, erkennt Doppelte, lässt sich rückgängig machen", async () => {
    const bytes = await makeDocx(["**2024-01-17 Bibelstunde WHV (Markus 4,35ff.)**", "**EINLEITUNG**", "Wie in Mk 4,40 steht: Habt ihr noch keinen Glauben?"]);
    const job = createJob("Wortbeiträge", 3);
    const path = "Themen/Glaube/2024-01-17 Bibelstunde WHV (Markus 4,35ff.)_Kleinglaube.docx";

    const first = await importOne(job, path, bytes, { topicsFromFolders: true });
    expect(first.status).toBe("importiert");
    const doc = getDocument(first.documentId!)!;
    expect(doc).toMatchObject({ title: "Kleinglaube", type: "bibelstudie", status: "gehalten", heldOn: "2024-01-17", place: "WHV", occasion: "Bibelstunde", series: "Bibelstunde Markus", mainRef: "Mk 4,35ff" });
    expect(doc.topics).toEqual(["Glaube"]);
    expect(doc.refs.map((r) => r.label)).toEqual(expect.arrayContaining(["Mk 4,35ff", "Mk 4,40"]));
    expect(listDocuments({ stelle: "Mk 4" }).items.map((d) => d.id)).toContain(doc.id);

    const [file] = filesForDocument(doc.id);
    expect(file).toMatchObject({ fileName: "2024-01-17 Bibelstunde WHV (Markus 4,35ff.)_Kleinglaube.docx", ext: "docx", size: bytes.byteLength });
    expect(existsSync(storedPath(file))).toBe(true);
    expect(new Uint8Array(readFileSync(storedPath(file)))).toEqual(bytes); // unverändert

    // Gleiche Datei unter anderem Namen → doppelt
    const again = await importOne(job, "Kopie/irgendwas.docx", bytes, { topicsFromFolders: true });
    expect(again).toMatchObject({ status: "doppelt", documentId: doc.id });

    // Unbekannter Typ und leere Datei
    expect((await importOne(job, "Bilder/x.png", new Uint8Array([1]), { topicsFromFolders: true })).status).toBe("uebersprungen");
    expect((await importOne(job, "leer.docx", new Uint8Array(), { topicsFromFolders: true })).status).toBe("fehler");

    expect(jobSummary(job)!.counts).toEqual({ importiert: 1, doppelt: 1, uebersprungen: 1, fehler: 1 });
    expect(jobItems(job, "importiert")).toHaveLength(1);

    // Rückgängig → Papierkorb; danach darf dieselbe Datei wieder importiert werden
    expect(undoJob(job)).toBe(1);
    expect(getDocument(doc.id)!.deletedAt).not.toBeNull();
    const job2 = createJob("nochmal", 1);
    expect((await importOne(job2, path, bytes, { topicsFromFolders: false })).status).toBe("importiert");
  });

  it("kaputte Datei wird als Fehler protokolliert, nicht abgebrochen", async () => {
    const job = createJob("kaputt", 1);
    const r = await importOne(job, "Predigten/kaputt.docx", new Uint8Array([80, 75, 3, 4, 0, 0]), { topicsFromFolders: true });
    expect(r.status).toBe("fehler");
    expect(r.message).toMatch(/Konnte nicht gelesen werden/);
  });
});
