import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { presentations } from "@/db/schema";
import { dataDir } from "@/lib/data-dir";
import { getDocument } from "@/lib/documents";
import type { JSONNode } from "@/lib/content";
import { draftFromDocument } from "@/lib/slides/draft";
import { emptySlide, slideSchema, THEME_IDS, type Slide, type ThemeId } from "@/lib/slides/types";

export type PresentationDetail = { id: string; title: string; documentId: string | null; theme: ThemeId; slides: Slide[]; updatedAt: number };

const parseSlides = (json: string): Slide[] => {
  const raw = z.array(z.unknown()).safeParse(JSON.parse(json || "[]"));
  if (!raw.success) return [];
  return raw.data.map((s) => slideSchema.safeParse(s)).filter((r) => r.success).map((r) => r.data!);
};

export function createPresentation(opts: { title?: string; documentId?: string | null; slides?: Slide[]; theme?: ThemeId } = {}): string {
  const id = randomUUID();
  const now = new Date();
  db()
    .insert(presentations)
    .values({ id, title: opts.title ?? "", documentId: opts.documentId ?? null, theme: opts.theme ?? "anthrazit", slidesJson: JSON.stringify(opts.slides ?? [emptySlide("titel")]), createdAt: now, updatedAt: now })
    .run();
  return id;
}

/** Entwurf aus einer Predigt: Gliederung, Bibel-Blöcke und Zitate werden Folien. */
export function createFromDocument(documentId: string): string {
  const doc = getDocument(documentId);
  if (!doc) throw new Error("Dokument nicht gefunden");
  const slides = draftFromDocument(JSON.parse(doc.contentJson) as JSONNode, { title: doc.title, mainRef: doc.mainRef, heldOn: doc.heldOn, place: doc.place });
  return createPresentation({ title: doc.title || "Ohne Titel", documentId, slides });
}

export function getPresentation(id: string): PresentationDetail | undefined {
  const p = db().select().from(presentations).where(eq(presentations.id, id)).get();
  if (!p) return undefined;
  return { id: p.id, title: p.title, documentId: p.documentId, theme: (THEME_IDS.includes(p.theme as ThemeId) ? p.theme : "anthrazit") as ThemeId, slides: parseSlides(p.slidesJson), updatedAt: p.updatedAt.getTime() };
}

export function listPresentations() {
  return db()
    .select({ id: presentations.id, title: presentations.title, theme: presentations.theme, documentId: presentations.documentId, slidesJson: presentations.slidesJson, updatedAt: presentations.updatedAt })
    .from(presentations)
    .orderBy(desc(presentations.updatedAt))
    .all()
    .map(({ slidesJson, ...p }) => ({ ...p, slideCount: parseSlides(slidesJson).length, first: parseSlides(slidesJson)[0] }));
}

export const presentationsForDocument = (documentId: string) =>
  db().select({ id: presentations.id, title: presentations.title }).from(presentations).where(eq(presentations.documentId, documentId)).orderBy(desc(presentations.updatedAt)).all();

export const saveSchema = z.object({
  baseUpdatedAt: z.number().int(),
  title: z.string().max(300),
  theme: z.enum(THEME_IDS as [ThemeId, ...ThemeId[]]),
  slides: z.array(slideSchema).max(300),
});

export type SaveResult = { ok: true; updatedAt: number } | { ok: false; reason: "conflict" | "missing"; updatedAt?: number };

export function savePresentation(id: string, input: z.infer<typeof saveSchema>, force = false): SaveResult {
  return db().transaction((tx): SaveResult => {
    const row = tx.select({ updatedAt: presentations.updatedAt }).from(presentations).where(eq(presentations.id, id)).get();
    if (!row) return { ok: false, reason: "missing" };
    if (!force && row.updatedAt.getTime() > input.baseUpdatedAt) return { ok: false, reason: "conflict", updatedAt: row.updatedAt.getTime() };
    const stamp = new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1));
    tx.update(presentations).set({ title: input.title.trim(), theme: input.theme, slidesJson: JSON.stringify(input.slides), updatedAt: stamp }).where(eq(presentations.id, id)).run();
    return { ok: true, updatedAt: stamp.getTime() };
  });
}

export function deletePresentation(id: string) {
  db().delete(presentations).where(eq(presentations.id, id)).run();
}

export function duplicatePresentation(id: string): string {
  const p = getPresentation(id);
  if (!p) throw new Error("Nicht gefunden");
  return createPresentation({ title: `${p.title || "Ohne Titel"} (Kopie)`, documentId: p.documentId, theme: p.theme, slides: p.slides.map((s) => ({ ...s, id: `${s.id}k` })) });
}

// ── Bilder für Folien ────────────────────────────────────────────────────────

export const mediaDir = () => join(/* turbopackIgnore: true */ dataDir(), "media");
const SIGNATURES: [string, (b: Uint8Array) => boolean][] = [
  ["png", (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47],
  ["jpg", (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ["gif", (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46],
  ["webp", (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50],
];

/** Bild speichern (Typ anhand der Datei-Bytes geprüft). Gibt "<sha256>.<ext>" zurück. */
export function storeImage(bytes: Uint8Array): string {
  const ext = SIGNATURES.find(([, test]) => test(bytes))?.[0];
  if (!ext) throw new Error("Nur PNG, JPEG, WebP oder GIF");
  const name = `${createHash("sha256").update(bytes).digest("hex")}.${ext}`;
  mkdirSync(/* turbopackIgnore: true */ mediaDir(), { recursive: true });
  const path = join(/* turbopackIgnore: true */ mediaDir(), name);
  if (!existsSync(/* turbopackIgnore: true */ path)) writeFileSync(/* turbopackIgnore: true */ path, bytes);
  return name;
}

export const isMediaName = (name: string) => /^[0-9a-f]{64}\.(png|jpg|webp|gif)$/.test(name);
