import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { aiRuns } from "@/db/schema";
import { createDocument, getDocument, saveDocument, type DocumentDetail, type SaveInput } from "@/lib/documents";
import { createPresentation } from "@/lib/presentations";
import { emptySlide, type Slide } from "@/lib/slides/types";
import { formatRef, parseRef } from "@/lib/bible/refs";
import { bibleAvailable, DEFAULT_TRANSLATION, textForRef, translations } from "@/lib/bible/db";
import type { JSONNode } from "@/lib/content";
import { markdownToDoc } from "./markdown";

// Ergebnisse übernehmen – immer nur auf ausdrücklichen Klick.

const asInput = (d: DocumentDetail): SaveInput => ({
  title: d.title,
  content: JSON.parse(d.contentJson) as JSONNode,
  type: d.type,
  status: d.status,
  heldOn: d.heldOn,
  occasion: d.occasion,
  place: d.place,
  series: d.series,
  mainRef: d.mainRef,
  summary: d.summary,
  favorite: d.favorite,
  topics: d.topics,
  tags: d.tags,
});

function requireDoc(id: string) {
  const d = getDocument(id);
  if (!d || d.deletedAt) throw new Error("Dokument nicht gefunden");
  return d;
}

export function applySummary(documentId: string, summary: string) {
  const d = requireDoc(documentId);
  saveDocument(documentId, { ...asInput(d), summary: summary.slice(0, 4000) }, d.updatedAt.getTime(), { manualVersion: false });
}

export function applyTopics(documentId: string, topics: string[]) {
  const d = requireDoc(documentId);
  saveDocument(documentId, { ...asInput(d), topics: [...d.topics, ...topics.map((t) => t.trim()).filter(Boolean)].slice(0, 50) }, d.updatedAt.getTime());
}

export function outlineToDocument(text: string, sourceId: string): string {
  const src = requireDoc(sourceId);
  const id = createDocument("notiz");
  saveDocument(
    id,
    { ...asInput(src), title: `Gliederungsvorschlag: ${src.title || "Ohne Titel"}`, content: markdownToDoc(text), type: "notiz", status: "entwurf", heldOn: null, summary: "Von Claude vorgeschlagen – bitte prüfen.", favorite: false, tags: ["KI-Vorschlag"] },
    Date.now(),
    { force: true },
  );
  return id;
}

const aiSlide = z.object({
  art: z.enum(["titel", "abschnitt", "punkte", "bibel", "zitat"]),
  titel: z.string().default(""),
  untertitel: z.string().default(""),
  punkte: z.array(z.string()).default([]),
  stelle: z.string().default(""),
  text: z.string().default(""),
  notizen: z.string().default(""),
});

/** Folienentwurf aus einem Claude-Lauf als bearbeitbare Präsentation anlegen. */
export function slidesFromRun(runId: string): string {
  const run = db().select().from(aiRuns).where(eq(aiRuns.id, runId)).get();
  if (!run || run.task !== "folien" || run.status !== "ok") throw new Error("Kein Folienentwurf");
  const parsed = z.object({ folien: z.array(aiSlide).max(40) }).parse(JSON.parse(run.result));
  const docId = (JSON.parse(run.documentIds) as string[])[0];
  const doc = getDocument(docId);
  // Übersetzung wie in den Bibel-Blöcken der Predigt, sonst Luther 1912
  const usedName = doc?.contentJson.match(/"translation":"([^"]+)"/)?.[1];
  const tr = bibleAvailable() ? (translations().find((t) => t.name === usedName) ?? translations().find((t) => t.id === DEFAULT_TRANSLATION))! : null;

  const slides: Slide[] = parsed.folien.map((f) => {
    const s = emptySlide(f.art);
    const notes = f.notizen.slice(0, 5000);
    switch (s.kind) {
      case "titel":
        return { ...s, notes, title: f.titel, subtitle: f.untertitel };
      case "abschnitt":
        return { ...s, notes, title: f.titel };
      case "punkte":
        return { ...s, notes, title: f.titel, points: f.punkte.slice(0, 12) };
      case "zitat":
        return { ...s, notes, text: f.text || f.titel, source: f.untertitel };
      case "bibel": {
        const ref = parseRef(f.stelle);
        const text = f.text || (ref && tr ? textForRef(tr.id, ref) : "");
        return { ...s, notes, reference: ref ? formatRef(ref) : f.stelle, translation: tr?.name ?? "", text: text.slice(0, 4000) };
      }
      default:
        return s;
    }
  });
  return createPresentation({ title: doc?.title || "Folienentwurf", documentId: doc ? docId : null, slides });
}
