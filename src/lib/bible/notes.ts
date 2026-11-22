import "server-only";
import { and, between, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookmarks, verseNotes } from "@/db/schema";

export function isBookmarked(verseId: number) {
  return Boolean(db().select().from(bookmarks).where(eq(bookmarks.verseId, verseId)).get());
}

export function setBookmark(verseId: number, on: boolean) {
  if (on) db().insert(bookmarks).values({ verseId, createdAt: new Date() }).onConflictDoNothing().run();
  else db().delete(bookmarks).where(eq(bookmarks.verseId, verseId)).run();
}

export function noteFor(verseId: number) {
  return db().select().from(verseNotes).where(eq(verseNotes.verseId, verseId)).get()?.text ?? "";
}

export function saveNote(verseId: number, text: string) {
  const clean = text.trim();
  if (!clean) db().delete(verseNotes).where(eq(verseNotes.verseId, verseId)).run();
  else
    db()
      .insert(verseNotes)
      .values({ verseId, text: clean, updatedAt: new Date() })
      .onConflictDoUpdate({ target: verseNotes.verseId, set: { text: clean, updatedAt: new Date() } })
      .run();
}

/** Markierungen eines Kapitels (für die Leseansicht). */
export function marksInRange(start: number, end: number) {
  const marked = new Set(db().select({ v: bookmarks.verseId }).from(bookmarks).where(between(bookmarks.verseId, start, end)).all().map((r) => r.v));
  const noted = new Set(db().select({ v: verseNotes.verseId }).from(verseNotes).where(between(verseNotes.verseId, start, end)).all().map((r) => r.v));
  return { marked, noted };
}

export function allBookmarks() {
  return db().select().from(bookmarks).orderBy(bookmarks.verseId).all();
}

export function allNotes() {
  return db().select().from(verseNotes).orderBy(desc(verseNotes.updatedAt)).all();
}

export function notesFor(ids: number[]) {
  return ids.length ? db().select().from(verseNotes).where(and(inArray(verseNotes.verseId, ids))).all() : [];
}
