-- Phase 6: Präsentationen. Folien als JSON (siehe src/lib/slides/types.ts).
CREATE TABLE presentations (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  document_id TEXT REFERENCES documents (id) ON DELETE SET NULL,
  theme       TEXT NOT NULL DEFAULT 'anthrazit',
  slides_json TEXT NOT NULL DEFAULT '[]',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX presentations_updated ON presentations (updated_at DESC);
CREATE INDEX presentations_document ON presentations (document_id);
