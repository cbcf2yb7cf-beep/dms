import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, isNull, lt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  bibleRefs,
  documentTags,
  documentTopics,
  documents,
  documentVersions,
  topics,
  type DocStatus,
  type DocType,
  type Document,
} from "@/db/schema";
import { blockReferences, EMPTY_DOC, plainText, sermonTemplate, wordCount, type JSONNode } from "@/lib/content";
import { formatRef, parseRef, parseRefs } from "@/lib/bible/refs";
import { indexDocument, searchIds } from "@/lib/search";
import { snippet } from "@/lib/search/stem";

const AUTO_VERSION_EVERY_MS = 5 * 60 * 1000;
const KEEP_AUTO_VERSIONS = 100;
export const TRASH_DAYS = 30;

// ── Anlegen ────────────────────────────────────────────────────────────────

export function createDocument(type: DocType): string {
  const id = randomUUID();
  const now = new Date();
  const content = type === "predigt" || type === "vortrag" ? sermonTemplate() : EMPTY_DOC;
  db()
    .insert(documents)
    .values({ id, type, contentJson: JSON.stringify(content), createdAt: now, updatedAt: now })
    .run();
  return id;
}

// ── Lesen ──────────────────────────────────────────────────────────────────

export type RefInfo = { start: number; end: number; label: string; source: "main" | "block" | "text" };

export type DocumentDetail = Document & { topics: string[]; tags: string[]; refs: RefInfo[] };

export function getDocument(id: string): DocumentDetail | undefined {
  const doc = db().select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) return undefined;
  return { ...doc, topics: topicNamesFor([id]).get(id) ?? [], tags: tagNamesFor([id]).get(id) ?? [], refs: refsFor(id) };
}

function refsFor(id: string): RefInfo[] {
  return db()
    .select()
    .from(bibleRefs)
    .where(eq(bibleRefs.documentId, id))
    .orderBy(bibleRefs.id)
    .all()
    .map((r) => ({ start: r.startId, end: r.endId, source: r.source, label: formatRef({ start: r.startId, end: r.endId }) }));
}

function topicNamesFor(ids: string[]) {
  const map = new Map<string, string[]>();
  if (!ids.length) return map;
  const rows = db()
    .select({ documentId: documentTopics.documentId, name: topics.name })
    .from(documentTopics)
    .innerJoin(topics, eq(topics.id, documentTopics.topicId))
    .where(inArray(documentTopics.documentId, ids))
    .orderBy(topics.name)
    .all();
  for (const r of rows) map.set(r.documentId, [...(map.get(r.documentId) ?? []), r.name]);
  return map;
}

function tagNamesFor(ids: string[]) {
  const map = new Map<string, string[]>();
  if (!ids.length) return map;
  const rows = db().select().from(documentTags).where(inArray(documentTags.documentId, ids)).orderBy(documentTags.name).all();
  for (const r of rows) map.set(r.documentId, [...(map.get(r.documentId) ?? []), r.name]);
  return map;
}

// ── Speichern ──────────────────────────────────────────────────────────────

export type SaveInput = {
  title: string;
  content: JSONNode;
  type: DocType;
  status: DocStatus;
  heldOn: string | null;
  occasion: string;
  place: string;
  series: string;
  mainRef: string;
  summary: string;
  favorite: boolean;
  topics: string[];
  tags: string[];
};

export type SaveResult =
  | { ok: true; updatedAt: number; refs: RefInfo[]; wordCount: number }
  | { ok: false; reason: "conflict" | "missing"; updatedAt?: number };

/** Getrimmt, ohne Leere, ohne Doppel (Groß-/Kleinschreibung egal) – die erste Schreibweise gewinnt. */
function clean(list: string[]) {
  const seen = new Map<string, string>();
  for (const raw of list) {
    const s = raw.trim();
    if (s && !seen.has(s.toLowerCase())) seen.set(s.toLowerCase(), s);
  }
  return [...seen.values()];
}

/**
 * Speichert ein Dokument. `baseUpdatedAt` ist der Stand, den der Editor geladen hat:
 * ist das Dokument inzwischen woanders gespeichert worden, wird nichts überschrieben.
 */
export function saveDocument(id: string, input: SaveInput, baseUpdatedAt: number, opts: { manualVersion?: boolean; force?: boolean } = {}): SaveResult {
  const now = new Date();
  const json = JSON.stringify(input.content);
  const text = plainText(input.content);
  const words = wordCount(text);

  return db().transaction((tx): SaveResult => {
    const row = tx.select({ updatedAt: documents.updatedAt, deletedAt: documents.deletedAt }).from(documents).where(eq(documents.id, id)).get();
    if (!row || row.deletedAt) return { ok: false, reason: "missing" };
    if (!opts.force && row.updatedAt.getTime() > baseUpdatedAt) {
      return { ok: false, reason: "conflict", updatedAt: row.updatedAt.getTime() };
    }
    // Zeitstempel muss streng steigen, sonst erkennt der Konfliktschutz zwei Speicherungen
    // in derselben Millisekunde nicht (auf schnellen Rechnern tatsächlich passiert).
    const stamp = new Date(Math.max(now.getTime(), row.updatedAt.getTime() + 1));

    tx.update(documents)
      .set({
        title: input.title.trim(),
        type: input.type,
        status: input.status,
        heldOn: input.heldOn || null,
        occasion: input.occasion.trim(),
        place: input.place.trim(),
        series: input.series.trim(),
        mainRef: input.mainRef.trim(),
        summary: input.summary.trim(),
        favorite: input.favorite,
        contentJson: json,
        plainText: text,
        wordCount: words,
        updatedAt: stamp,
      })
      .where(eq(documents.id, id))
      .run();

    // Themen: fehlende anlegen (Groß-/Kleinschreibung egal), Zuordnung ersetzen.
    tx.delete(documentTopics).where(eq(documentTopics.documentId, id)).run();
    for (const name of clean(input.topics)) {
      let topic = tx.select().from(topics).where(sql`${topics.name} = ${name} COLLATE NOCASE`).get();
      if (!topic) {
        topic = { id: randomUUID(), name, parentId: null, createdAt: now };
        tx.insert(topics).values(topic).run();
      }
      tx.insert(documentTopics).values({ documentId: id, topicId: topic.id }).onConflictDoNothing().run();
    }

    tx.delete(documentTags).where(eq(documentTags.documentId, id)).run();
    for (const name of clean(input.tags)) tx.insert(documentTags).values({ documentId: id, name }).onConflictDoNothing().run();

    // Volltextsuche (Wortstämme) aktualisieren.
    indexDocument(tx as unknown as Parameters<typeof indexDocument>[0], {
      id,
      title: input.title,
      plainText: text,
      meta: [input.series, input.occasion, input.place, input.mainRef, input.summary, ...input.topics, ...input.tags],
    });

    // Bibelstellen neu indizieren: Haupttext > Bibel-Block > Fließtext.
    tx.delete(bibleRefs).where(eq(bibleRefs.documentId, id)).run();
    const seen = new Set<string>();
    const add = (refs: ReturnType<typeof parseRefs>, source: "main" | "block" | "text") => {
      for (const r of refs) {
        const key = `${r.start}-${r.end}`;
        if (seen.has(key)) continue;
        seen.add(key);
        tx.insert(bibleRefs).values({ documentId: id, book: r.book, startId: r.start, endId: r.end, source }).run();
      }
    };
    add(parseRefs(input.mainRef), "main");
    for (const ref of blockReferences(input.content)) add(parseRefs(ref), "block");
    add(parseRefs(text), "text");

    // Version: manuell immer, sonst höchstens alle 5 Minuten und nur bei Änderung.
    const last = tx.select().from(documentVersions).where(eq(documentVersions.documentId, id)).orderBy(desc(documentVersions.createdAt), desc(documentVersions.id)).limit(1).get();
    const changed = !last || last.contentJson !== json || last.title !== input.title.trim();
    const due = !last || now.getTime() - last.createdAt.getTime() >= AUTO_VERSION_EVERY_MS;
    if (opts.manualVersion || (changed && due)) {
      tx.insert(documentVersions)
        .values({ documentId: id, title: input.title.trim(), contentJson: json, wordCount: words, reason: opts.manualVersion ? "manuell" : "auto", createdAt: now })
        .run();
      pruneVersions(tx, id);
    }

    return { ok: true, updatedAt: stamp.getTime(), wordCount: words, refs: [] };
  });
}

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

function pruneVersions(tx: Tx, id: string) {
  // Nur automatische Versionen über KEEP_AUTO_VERSIONS hinaus löschen (SQLite: OFFSET braucht LIMIT, -1 = unbegrenzt).
  tx.run(sql`DELETE FROM document_versions WHERE id IN (
    SELECT id FROM document_versions WHERE document_id = ${id} AND reason = 'auto'
    ORDER BY created_at DESC LIMIT -1 OFFSET ${KEEP_AUTO_VERSIONS})`);
}

/** Nach dem Speichern: frische Bibelstellen für die Anzeige im Editor. */
export function saveAndReport(id: string, input: SaveInput, baseUpdatedAt: number, opts?: { manualVersion?: boolean }): SaveResult {
  const result = saveDocument(id, input, baseUpdatedAt, opts);
  return result.ok ? { ...result, refs: refsFor(id) } : result;
}

// ── Versionen ──────────────────────────────────────────────────────────────

export function listVersions(id: string) {
  return db()
    .select({ id: documentVersions.id, title: documentVersions.title, wordCount: documentVersions.wordCount, reason: documentVersions.reason, createdAt: documentVersions.createdAt })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, id))
    .orderBy(desc(documentVersions.createdAt), desc(documentVersions.id))
    .all();
}

export function getVersion(documentId: string, versionId: number) {
  return db()
    .select()
    .from(documentVersions)
    .where(and(eq(documentVersions.documentId, documentId), eq(documentVersions.id, versionId)))
    .get();
}

/** Stellt eine Version wieder her. Der aktuelle Stand wird vorher als Version gesichert. */
export function restoreVersion(documentId: string, versionId: number) {
  const version = getVersion(documentId, versionId);
  const doc = getDocument(documentId);
  if (!version || !doc) throw new Error("Version nicht gefunden");
  const now = Date.now();
  const base: SaveInput = {
    title: doc.title,
    content: JSON.parse(doc.contentJson) as JSONNode,
    type: doc.type,
    status: doc.status,
    heldOn: doc.heldOn,
    occasion: doc.occasion,
    place: doc.place,
    series: doc.series,
    mainRef: doc.mainRef,
    summary: doc.summary,
    favorite: doc.favorite,
    topics: doc.topics,
    tags: doc.tags,
  };
  saveDocument(documentId, base, now, { manualVersion: true, force: true });
  saveDocument(documentId, { ...base, title: version.title, content: JSON.parse(version.contentJson) as JSONNode }, now, { force: true });
  db()
    .insert(documentVersions)
    .values({ documentId, title: version.title, contentJson: version.contentJson, wordCount: version.wordCount, reason: "wiederhergestellt", createdAt: new Date() })
    .run();
}

// ── Liste & Filter ─────────────────────────────────────────────────────────

export type ListFilter = {
  q?: string;
  type?: DocType;
  status?: DocStatus;
  topic?: string;
  tag?: string;
  series?: string;
  year?: string;
  stelle?: string;
  /** Ganzes Bibelbuch (1–66) */
  book?: number;
  favorite?: boolean;
  view?: "aktiv" | "archiv" | "papierkorb";
  sort?: "relevanz" | "bearbeitet" | "gehalten" | "titel" | "erstellt";
  limit?: number;
};

export type ListItem = Pick<
  Document,
  "id" | "type" | "title" | "status" | "heldOn" | "occasion" | "series" | "mainRef" | "favorite" | "wordCount" | "updatedAt" | "createdAt" | "deletedAt" | "archivedAt"
> & { topics: string[]; snippet?: string | null };

const likeEscape = (s: string) => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export function listDocuments(filter: ListFilter = {}): { items: ListItem[]; stelle?: string } {
  const where: SQL[] = [];
  const view = filter.view ?? "aktiv";
  if (view === "papierkorb") where.push(isNotNull(documents.deletedAt));
  else {
    where.push(isNull(documents.deletedAt));
    where.push(view === "archiv" ? isNotNull(documents.archivedAt) : isNull(documents.archivedAt));
  }
  if (filter.type) where.push(eq(documents.type, filter.type));
  if (filter.status) where.push(eq(documents.status, filter.status));
  if (filter.favorite) where.push(eq(documents.favorite, true));
  if (filter.series) where.push(sql`${documents.series} = ${filter.series} COLLATE NOCASE`);
  if (filter.year && /^\d{4}$/.test(filter.year)) where.push(sql`substr(${documents.heldOn}, 1, 4) = ${filter.year}`);
  if (filter.topic) {
    where.push(
      sql`EXISTS (SELECT 1 FROM document_topics dt JOIN topics t ON t.id = dt.topic_id WHERE dt.document_id = ${documents.id} AND t.name = ${filter.topic} COLLATE NOCASE)`,
    );
  }
  if (filter.tag) where.push(sql`EXISTS (SELECT 1 FROM document_tags g WHERE g.document_id = ${documents.id} AND g.name = ${filter.tag} COLLATE NOCASE)`);

  if (filter.book && filter.book >= 1 && filter.book <= 66) {
    where.push(sql`EXISTS (SELECT 1 FROM bible_refs r WHERE r.document_id = ${documents.id} AND r.book = ${filter.book})`);
  }

  let stelle: string | undefined;
  if (filter.stelle) {
    const ref = parseRef(filter.stelle);
    if (ref) {
      stelle = formatRef(ref);
      where.push(sql`EXISTS (SELECT 1 FROM bible_refs r WHERE r.document_id = ${documents.id} AND r.start_id <= ${ref.end} AND r.end_id >= ${ref.start})`);
    } else {
      where.push(sql`0`); // ungültige Stelle: nichts finden statt alles zeigen
    }
  }

  // Volltextsuche über Wortstämme (Titel, Text, Themen, Reihe, Ort …), nach Relevanz.
  let ranked: { ids: string[]; stems: string[] } | null = null;
  if (filter.q?.trim()) {
    ranked = searchIds(filter.q);
    if (ranked) where.push(ranked.ids.length ? inArray(documents.id, ranked.ids) : sql`0`);
  }

  const sort = filter.sort ?? (ranked ? "relevanz" : "bearbeitet");
  const order = {
    relevanz: [desc(documents.updatedAt)], // Rangfolge wird unten nach dem Suchindex sortiert
    bearbeitet: [desc(documents.updatedAt)],
    gehalten: [sql`${documents.heldOn} IS NULL`, desc(documents.heldOn), desc(documents.updatedAt)],
    titel: [sql`${documents.title} = ''`, sql`${documents.title} COLLATE NOCASE`],
    erstellt: [desc(documents.createdAt)],
  }[sort];

  const rows = db()
    .select({
      id: documents.id,
      type: documents.type,
      title: documents.title,
      status: documents.status,
      heldOn: documents.heldOn,
      occasion: documents.occasion,
      series: documents.series,
      mainRef: documents.mainRef,
      favorite: documents.favorite,
      wordCount: documents.wordCount,
      updatedAt: documents.updatedAt,
      createdAt: documents.createdAt,
      deletedAt: documents.deletedAt,
      archivedAt: documents.archivedAt,
    })
    .from(documents)
    .where(and(...where))
    .orderBy(...order)
    .limit(filter.limit ?? 500)
    .all();

  const topicMap = topicNamesFor(rows.map((r) => r.id));
  let items: ListItem[] = rows.map((r) => ({ ...r, topics: topicMap.get(r.id) ?? [] }));
  if (ranked) {
    if (sort === "relevanz") {
      const rank = new Map(ranked.ids.map((id, i) => [id, i]));
      items.sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));
    }
    // Textausschnitt mit markierten Treffern
    const texts = new Map(
      db()
        .select({ id: documents.id, plainText: documents.plainText })
        .from(documents)
        .where(inArray(documents.id, items.slice(0, 200).map((i) => i.id)))
        .all()
        .map((r) => [r.id, r.plainText]),
    );
    items = items.map((i) => ({ ...i, snippet: snippet(texts.get(i.id) ?? "", ranked!.stems) }));
  }
  return { items, stelle };
}

/** Werte für Filter und Vorschläge im Editor. */
export function facets() {
  const d = db();
  const alive = and(isNull(documents.deletedAt));
  return {
    topics: d.select({ name: topics.name }).from(topics).orderBy(sql`${topics.name} COLLATE NOCASE`).all().map((t) => t.name),
    tags: d.selectDistinct({ name: documentTags.name }).from(documentTags).orderBy(sql`${documentTags.name} COLLATE NOCASE`).all().map((t) => t.name),
    series: d
      .selectDistinct({ name: documents.series })
      .from(documents)
      .where(and(alive, sql`${documents.series} <> ''`))
      .orderBy(documents.series)
      .all()
      .map((s) => s.name),
    occasions: d
      .selectDistinct({ name: documents.occasion })
      .from(documents)
      .where(and(alive, sql`${documents.occasion} <> ''`))
      .orderBy(documents.occasion)
      .all()
      .map((s) => s.name),
    places: d
      .selectDistinct({ name: documents.place })
      .from(documents)
      .where(and(alive, sql`${documents.place} <> ''`))
      .orderBy(documents.place)
      .all()
      .map((s) => s.name),
    years: d
      .selectDistinct({ year: sql<string>`substr(${documents.heldOn}, 1, 4)` })
      .from(documents)
      .where(and(alive, isNotNull(documents.heldOn)))
      .orderBy(sql`1 DESC`)
      .all()
      .map((y) => y.year),
  };
}

export function stats() {
  const rows = db()
    .select({ type: documents.type, n: sql<number>`count(*)`, words: sql<number>`coalesce(sum(${documents.wordCount}), 0)` })
    .from(documents)
    .where(and(isNull(documents.deletedAt), isNull(documents.archivedAt)))
    .groupBy(documents.type)
    .all();
  const topicCount = db().select({ n: sql<number>`count(DISTINCT ${documentTopics.topicId})` }).from(documentTopics).get()?.n ?? 0;
  return { byType: rows, total: rows.reduce((s, r) => s + r.n, 0), words: rows.reduce((s, r) => s + r.words, 0), topics: topicCount };
}

/** Themen mit Anzahl der (nicht gelöschten) Dokumente, für Dashboard und Filter. */
export function topicCounts(limit = 20) {
  return db()
    .select({ name: topics.name, n: sql<number>`count(*)` })
    .from(documentTopics)
    .innerJoin(topics, eq(topics.id, documentTopics.topicId))
    .innerJoin(documents, eq(documents.id, documentTopics.documentId))
    .where(isNull(documents.deletedAt))
    .groupBy(topics.id)
    .orderBy(desc(sql`count(*)`), topics.name)
    .limit(limit)
    .all();
}

/** Schnellsuche für ⌘K: Titel, Reihe, Haupttext. */
export function quickSearch(q: string, limit = 8) {
  const cols = { id: documents.id, title: documents.title, type: documents.type, mainRef: documents.mainRef, heldOn: documents.heldOn };
  // Titel, Reihe, Haupttext direkt – dann Volltext nach Relevanz
  const p = likeEscape(q.trim());
  const direct = db()
    .select(cols)
    .from(documents)
    .where(and(isNull(documents.deletedAt), sql`(${documents.title} LIKE ${p} ESCAPE '\\' OR ${documents.series} LIKE ${p} ESCAPE '\\' OR ${documents.mainRef} LIKE ${p} ESCAPE '\\')`))
    .orderBy(desc(documents.updatedAt))
    .limit(limit)
    .all();
  if (direct.length >= limit) return direct;
  const ranked = searchIds(q, 50);
  if (!ranked?.ids.length) return direct;
  const seen = new Set(direct.map((d) => d.id));
  const more = db().select(cols).from(documents).where(and(isNull(documents.deletedAt), inArray(documents.id, ranked.ids.filter((id) => !seen.has(id))))).all();
  const rank = new Map(ranked.ids.map((id, i) => [id, i]));
  more.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  return [...direct, ...more].slice(0, limit);
}

// ── Aktionen ───────────────────────────────────────────────────────────────

const touch = (id: string, set: Partial<typeof documents.$inferInsert>) =>
  db().update(documents).set({ ...set, updatedAt: new Date() }).where(eq(documents.id, id)).run();

export const setFavorite = (id: string, favorite: boolean) => touch(id, { favorite });
export const setArchived = (id: string, archived: boolean) => touch(id, { archivedAt: archived ? new Date() : null });
export const moveToTrash = (id: string) => touch(id, { deletedAt: new Date() });
export const restoreFromTrash = (id: string) => touch(id, { deletedAt: null });

/** Endgültig löschen — nur aus dem Papierkorb heraus. */
export function deleteForever(id: string) {
  db().delete(documents).where(and(eq(documents.id, id), isNotNull(documents.deletedAt))).run();
  db().run(sql`DELETE FROM docs_fts WHERE doc_id NOT IN (SELECT id FROM documents)`);
}

/** Papierkorb nach TRASH_DAYS Tagen leeren. */
export function purgeTrash(now = Date.now()) {
  const cutoff = new Date(now - TRASH_DAYS * 86_400_000);
  const removed = db().delete(documents).where(and(isNotNull(documents.deletedAt), lt(documents.deletedAt, cutoff))).run();
  if (removed.changes) db().run(sql`DELETE FROM docs_fts WHERE doc_id NOT IN (SELECT id FROM documents)`);
}

export function duplicateDocument(id: string): string {
  const doc = getDocument(id);
  if (!doc) throw new Error("Dokument nicht gefunden");
  const copy = createDocument(doc.type);
  saveDocument(
    copy,
    {
      title: `${doc.title || "Ohne Titel"} (Kopie)`,
      content: JSON.parse(doc.contentJson) as JSONNode,
      type: doc.type,
      status: "entwurf",
      heldOn: null,
      occasion: doc.occasion,
      place: doc.place,
      series: doc.series,
      mainRef: doc.mainRef,
      summary: doc.summary,
      favorite: false,
      topics: doc.topics,
      tags: doc.tags,
    },
    Date.now(),
    { force: true },
  );
  return copy;
}
