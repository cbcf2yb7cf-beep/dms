import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { documentFiles, documents, importItems, importJobs, type ImportStatus } from "@/db/schema";
import { createDocument, moveToTrash, saveDocument } from "@/lib/documents";
import { originalsDir } from "@/lib/data-dir";
import { extract } from "./extract";
import { extOf, isJunk, SUPPORTED, type SupportedExt } from "./formats";
import { parseFileName } from "./filename";
import { finalizeContent } from "./finalize";

export type ItemResult = { status: ImportStatus; message: string; documentId?: string; title?: string };

export function createJob(label: string, total: number): string {
  const id = randomUUID();
  db().insert(importJobs).values({ id, label: label.slice(0, 200), total, createdAt: new Date() }).run();
  return id;
}

export function jobExists(id: string) {
  return Boolean(db().select({ id: importJobs.id }).from(importJobs).where(eq(importJobs.id, id)).get());
}

function record(jobId: string, path: string, result: ItemResult): ItemResult {
  db()
    .insert(importItems)
    .values({ jobId, path: path.slice(0, 1000), status: result.status, message: result.message.slice(0, 1000), documentId: result.documentId ?? null, createdAt: new Date() })
    .run();
  return result;
}

/** Vom Browser übersprungene Dateien (Format-Doppel, nicht lesbar) im Protokoll vermerken. */
export function recordSkip(jobId: string, path: string, status: "uebersprungen" | "fehler", message: string) {
  return record(jobId, path, { status, message });
}

/** Eine Datei importieren. Ändert die Originaldatei nie; sie wird unverändert abgelegt. */
export async function importOne(jobId: string, relPath: string, bytes: Uint8Array, opts: { topicsFromFolders: boolean }): Promise<ItemResult> {
  const name = relPath.split("/").pop() ?? relPath;
  const ext = extOf(name);
  if (isJunk(name)) return record(jobId, relPath, { status: "uebersprungen", message: "Systemdatei" });
  if (!(SUPPORTED as readonly string[]).includes(ext)) return record(jobId, relPath, { status: "uebersprungen", message: `Dateityp .${ext || "?"} wird nicht unterstützt` });
  if (!bytes.byteLength) return record(jobId, relPath, { status: "fehler", message: "Datei ist leer. Bei OneDrive: „Immer auf diesem Gerät behalten“ wählen und erneut importieren." });

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const dup = db()
    .select({ documentId: documents.id, title: documents.title })
    .from(documentFiles)
    .innerJoin(documents, eq(documents.id, documentFiles.documentId))
    .where(and(eq(documentFiles.sha256, sha256), isNull(documents.deletedAt)))
    .get();
  if (dup) return record(jobId, relPath, { status: "doppelt", message: `Bereits vorhanden: „${dup.title || "Ohne Titel"}“`, documentId: dup.documentId, title: dup.title });

  const meta = parseFileName(relPath);
  if (!opts.topicsFromFolders) meta.topics = [];

  let extracted;
  try {
    extracted = await extract(ext as SupportedExt, bytes);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return record(jobId, relPath, { status: "fehler", message: `Konnte nicht gelesen werden: ${msg.slice(0, 200)}` });
  }
  const { content, title } = finalizeContent(extracted.content, meta, { keepFirst: ext === "pptx" });

  // Original unverändert ablegen (Dateiname = Prüfsumme; gleiche Datei nur einmal auf der Platte).
  // turbopackIgnore: Datenordner zur Laufzeit, nicht das Projekt in den Build ziehen.
  mkdirSync(/* turbopackIgnore: true */ originalsDir(), { recursive: true });
  const stored = join(/* turbopackIgnore: true */ originalsDir(), `${sha256}.${ext}`);
  if (!existsSync(/* turbopackIgnore: true */ stored)) writeFileSync(/* turbopackIgnore: true */ stored, bytes, { flag: "wx" });

  const id = createDocument(meta.type);
  saveDocument(
    id,
    {
      title,
      content,
      type: meta.type,
      status: meta.status,
      heldOn: meta.heldOn,
      occasion: meta.occasion,
      place: meta.place,
      series: meta.series,
      mainRef: meta.mainRef,
      summary: "",
      favorite: false,
      topics: meta.topics,
      tags: [],
    },
    Date.now(),
    { force: true },
  );
  db()
    .insert(documentFiles)
    .values({ id: randomUUID(), documentId: id, sha256, fileName: name, relPath, ext, size: bytes.byteLength, importJobId: jobId, createdAt: new Date() })
    .run();

  return record(jobId, relPath, { status: "importiert", message: extracted.warnings.join(" "), documentId: id, title });
}

export function finishJob(jobId: string) {
  db().update(importJobs).set({ finishedAt: new Date() }).where(eq(importJobs.id, jobId)).run();
}

export function jobSummary(jobId: string) {
  const job = db().select().from(importJobs).where(eq(importJobs.id, jobId)).get();
  if (!job) return undefined;
  const counts = Object.fromEntries(
    db()
      .select({ status: importItems.status, n: sql<number>`count(*)` })
      .from(importItems)
      .where(eq(importItems.jobId, jobId))
      .groupBy(importItems.status)
      .all()
      .map((r) => [r.status, r.n]),
  ) as Partial<Record<ImportStatus, number>>;
  return { ...job, counts };
}

export function jobItems(jobId: string, status?: ImportStatus) {
  return db()
    .select({ id: importItems.id, path: importItems.path, status: importItems.status, message: importItems.message, documentId: importItems.documentId, title: documents.title, deletedAt: documents.deletedAt })
    .from(importItems)
    .leftJoin(documents, eq(documents.id, importItems.documentId))
    .where(status ? and(eq(importItems.jobId, jobId), eq(importItems.status, status)) : eq(importItems.jobId, jobId))
    .orderBy(importItems.path)
    .all();
}

export function listJobs(limit = 20) {
  return db()
    .select({ id: importJobs.id })
    .from(importJobs)
    .orderBy(desc(importJobs.createdAt))
    .limit(limit)
    .all()
    .map((j) => jobSummary(j.id)!)
    .filter(Boolean);
}

/** Import rückgängig: alle dabei angelegten Dokumente in den Papierkorb (30 Tage wiederherstellbar). */
export function undoJob(jobId: string): number {
  const items = db()
    .select({ documentId: importItems.documentId })
    .from(importItems)
    .where(and(eq(importItems.jobId, jobId), eq(importItems.status, "importiert")))
    .all();
  let n = 0;
  for (const { documentId } of items) {
    if (!documentId) continue;
    const doc = db().select({ deletedAt: documents.deletedAt }).from(documents).where(eq(documents.id, documentId)).get();
    if (doc && !doc.deletedAt) {
      moveToTrash(documentId);
      n++;
    }
  }
  db().update(importJobs).set({ undoneAt: new Date() }).where(eq(importJobs.id, jobId)).run();
  return n;
}

export function filesForDocument(documentId: string) {
  return db().select().from(documentFiles).where(eq(documentFiles.documentId, documentId)).orderBy(documentFiles.createdAt).all();
}

export function getFile(id: string) {
  return db().select().from(documentFiles).where(eq(documentFiles.id, id)).get();
}

export const storedPath = (f: { sha256: string; ext: string }) => join(/* turbopackIgnore: true */ originalsDir(), `${f.sha256}.${f.ext}`);
