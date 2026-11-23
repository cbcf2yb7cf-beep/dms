import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { parseQuery, parseQuestion, stemText } from "./stem";

type Runner = { run: (query: ReturnType<typeof sql>) => unknown; all: <T>(query: ReturnType<typeof sql>) => T[] };

export type IndexInput = { id: string; title: string; plainText: string; meta: string[] };

/** Dokument (neu) in den Suchindex schreiben. `runner` = laufende Transaktion oder db(). */
export function indexDocument(runner: Runner, doc: IndexInput) {
  runner.run(sql`DELETE FROM docs_fts WHERE doc_id = ${doc.id}`);
  runner.run(sql`INSERT INTO docs_fts (doc_id, title, body, meta) VALUES (${doc.id}, ${stemText(doc.title)}, ${stemText(doc.plainText)}, ${stemText(doc.meta.filter(Boolean).join(" "))})`);
}

export function removeFromIndex(id: string) {
  db().run(sql`DELETE FROM docs_fts WHERE doc_id = ${id}`);
}

/** Ein Dokument aus der Datenbank neu indizieren (z. B. nach Umbenennen eines Themas). */
export function reindexDocuments(ids: string[]) {
  const d = db();
  for (const id of ids) {
    const r = d.all<{ id: string; title: string; plain_text: string; series: string; occasion: string; place: string; main_ref: string; summary: string }>(
      sql`SELECT id, title, plain_text, series, occasion, place, main_ref, summary FROM documents WHERE id = ${id}`,
    )[0];
    if (!r) continue;
    const names = d.all<{ name: string }>(sql`SELECT t.name FROM document_topics dt JOIN topics t ON t.id = dt.topic_id WHERE dt.document_id = ${id} UNION ALL SELECT name FROM document_tags WHERE document_id = ${id}`).map((x) => x.name);
    indexDocument(d as unknown as Runner, { id, title: r.title, plainText: r.plain_text, meta: [r.series, r.occasion, r.place, r.main_ref, r.summary, ...names] });
  }
}

/** Treffer nach Relevanz (Titel zählt am meisten). Gibt doc_ids in Rangfolge zurück. */
export function searchIds(input: string, limit = 2000, mode: "alle" | "frage" = "alle"): { ids: string[]; stems: string[] } | null {
  const q = mode === "frage" ? parseQuestion(input) : parseQuery(input);
  if (!q) return null;
  try {
    const rows = db().all<{ doc_id: string }>(sql`SELECT doc_id FROM docs_fts WHERE docs_fts MATCH ${q.fts} ORDER BY bm25(docs_fts, 0, 6, 1, 3) LIMIT ${limit}`);
    return { ids: rows.map((r) => r.doc_id), stems: q.stems };
  } catch {
    return { ids: [], stems: q.stems }; // ungültige Eingabe → keine Treffer statt Fehler
  }
}

/** Index vollständig neu aufbauen (beim Start, falls nötig – z. B. nach dem Update auf Phase 5). */
export function rebuildIndexIfNeeded() {
  const d = db();
  const docs = d.all<{ n: number }>(sql`SELECT count(*) AS n FROM documents`)[0].n;
  const indexed = d.all<{ n: number }>(sql`SELECT count(*) AS n FROM docs_fts`)[0].n;
  if (docs === indexed) return 0;
  const rows = d.all<{ id: string; title: string; plain_text: string; series: string; occasion: string; place: string; main_ref: string; summary: string }>(
    sql`SELECT id, title, plain_text, series, occasion, place, main_ref, summary FROM documents`,
  );
  const topics = d.all<{ document_id: string; name: string }>(sql`SELECT dt.document_id, t.name FROM document_topics dt JOIN topics t ON t.id = dt.topic_id`);
  const tags = d.all<{ document_id: string; name: string }>(sql`SELECT document_id, name FROM document_tags`);
  const extra = new Map<string, string[]>();
  for (const r of [...topics, ...tags]) extra.set(r.document_id, [...(extra.get(r.document_id) ?? []), r.name]);
  d.transaction((tx) => {
    tx.run(sql`DELETE FROM docs_fts`);
    for (const r of rows) {
      indexDocument(tx as unknown as Runner, { id: r.id, title: r.title, plainText: r.plain_text, meta: [r.series, r.occasion, r.place, r.main_ref, r.summary, ...(extra.get(r.id) ?? [])] });
    }
  });
  console.info(`[suche] Index neu aufgebaut: ${rows.length} Dokumente`);
  return rows.length;
}
