import "server-only";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { documentTopics, topics } from "@/db/schema";
import { reindexDocuments } from "@/lib/search";
import { formatRef, END_VERSE } from "@/lib/bible/refs";
import { bookByNumber } from "@/lib/bible/books";

export type TopicRow = { id: string; name: string; parentId: string | null; n: number };

/** Alle Themen mit Anzahl der (nicht gelöschten) Dokumente. */
export function listTopics(): TopicRow[] {
  return db().all<TopicRow>(sql`
    SELECT t.id, t.name, t.parent_id AS parentId,
      (SELECT count(*) FROM document_topics dt JOIN documents d ON d.id = dt.document_id WHERE dt.topic_id = t.id AND d.deleted_at IS NULL) AS n
    FROM topics t ORDER BY t.name COLLATE NOCASE`);
}

export function getTopic(id: string) {
  return db().select().from(topics).where(eq(topics.id, id)).get();
}

const docIdsOf = (topicId: string) => db().select({ id: documentTopics.documentId }).from(documentTopics).where(eq(documentTopics.topicId, topicId)).all().map((r) => r.id);

/** Querverbindungen: Themen, die oft gemeinsam mit diesem vorkommen. */
export function relatedTopics(topicId: string, limit = 12) {
  return db().all<{ id: string; name: string; n: number }>(sql`
    SELECT t.id, t.name, count(*) AS n FROM document_topics a
    JOIN document_topics b ON b.document_id = a.document_id AND b.topic_id <> a.topic_id
    JOIN topics t ON t.id = b.topic_id
    JOIN documents d ON d.id = a.document_id AND d.deleted_at IS NULL
    WHERE a.topic_id = ${topicId} GROUP BY t.id ORDER BY n DESC, t.name LIMIT ${limit}`);
}

/** Häufigste Bibelkapitel in den Dokumenten eines Themas. */
export function chaptersForTopic(topicId: string, limit = 12) {
  return db()
    .all<{ chapter: number; n: number }>(sql`
      SELECT r.start_id / 1000 AS chapter, count(DISTINCT r.document_id) AS n FROM bible_refs r
      JOIN document_topics dt ON dt.document_id = r.document_id AND dt.topic_id = ${topicId}
      JOIN documents d ON d.id = r.document_id AND d.deleted_at IS NULL
      GROUP BY chapter ORDER BY n DESC, chapter LIMIT ${limit}`)
    .map((r) => ({ ...r, label: formatRef({ start: r.chapter * 1000 + 1, end: r.chapter * 1000 + END_VERSE }) }));
}

/** Umbenennen. Gibt es den Namen schon, werden beide Themen zusammengeführt. */
export function renameTopic(id: string, rawName: string): { merged: boolean; id: string } {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Name fehlt");
  const d = db();
  const affected = docIdsOf(id);
  const target = d.select().from(topics).where(sql`${topics.name} = ${name} COLLATE NOCASE AND ${topics.id} <> ${id}`).get();
  if (!target) {
    d.update(topics).set({ name }).where(eq(topics.id, id)).run();
    reindexDocuments(affected);
    return { merged: false, id };
  }
  d.transaction((tx) => {
    for (const docId of affected) tx.insert(documentTopics).values({ documentId: docId, topicId: target.id }).onConflictDoNothing().run();
    tx.update(topics).set({ parentId: target.id }).where(eq(topics.parentId, id)).run();
    if (target.parentId === id) tx.update(topics).set({ parentId: null }).where(eq(topics.id, target.id)).run();
    tx.delete(topics).where(eq(topics.id, id)).run(); // document_topics fällt per CASCADE weg
  });
  reindexDocuments(affected);
  return { merged: true, id: target.id };
}

/** Oberthema setzen (ohne Kreise: ein Thema kann nicht unter sich selbst oder seinen Unterthemen hängen). */
export function setParent(id: string, parentId: string | null) {
  if (parentId) {
    let cur: string | null = parentId;
    for (let i = 0; cur && i < 50; i++) {
      if (cur === id) throw new Error("Ein Thema kann nicht unter sich selbst stehen.");
      cur = getTopic(cur)?.parentId ?? null;
    }
  }
  db().update(topics).set({ parentId }).where(eq(topics.id, id)).run();
}

export function deleteTopic(id: string) {
  const affected = docIdsOf(id);
  db().update(topics).set({ parentId: null }).where(eq(topics.parentId, id)).run();
  db().delete(topics).where(eq(topics.id, id)).run();
  reindexDocuments(affected);
}

export function createTopic(rawName: string, parentId: string | null = null) {
  const name = rawName.trim().replace(/\s+/g, " ");
  const existing = db().select().from(topics).where(sql`${topics.name} = ${name} COLLATE NOCASE`).get();
  if (existing) return existing.id;
  const id = randomUUID();
  db().insert(topics).values({ id, name, parentId, createdAt: new Date() }).run();
  return id;
}

/** Reihen mit Anzahl. */
export function seriesCounts() {
  return db().all<{ name: string; n: number }>(sql`SELECT series AS name, count(*) AS n FROM documents WHERE deleted_at IS NULL AND series <> '' GROUP BY series COLLATE NOCASE ORDER BY n DESC, name LIMIT 60`);
}

/** Bibelbücher: in wie vielen Dokumenten sie als Haupttext vorkommen. */
export function bookCounts() {
  return db()
    .all<{ book: number; n: number }>(sql`SELECT r.book, count(DISTINCT r.document_id) AS n FROM bible_refs r JOIN documents d ON d.id = r.document_id AND d.deleted_at IS NULL WHERE r.source = 'main' GROUP BY r.book ORDER BY r.book`)
    .map((r) => ({ ...r, name: bookByNumber(r.book).name, abbr: bookByNumber(r.book).abbr }));
}

/** Dokument-IDs ohne Thema (zum Nacharbeiten). */
export function untaggedCount() {
  return db().all<{ n: number }>(sql`SELECT count(*) AS n FROM documents d WHERE d.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM document_topics dt WHERE dt.document_id = d.id)`)[0].n;
}

export const topicDocumentIds = docIdsOf;
