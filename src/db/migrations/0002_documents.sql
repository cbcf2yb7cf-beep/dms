-- Phase 2: Dokumente, Versionen, Themen, Schlagwörter, Bibelstellen.
CREATE TABLE documents (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,                 -- predigt | vortrag | bibelstudie | andacht | notiz
  title        TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'entwurf', -- entwurf | fertig | gehalten
  held_on      TEXT,                           -- YYYY-MM-DD
  occasion     TEXT NOT NULL DEFAULT '',       -- Anlass
  place        TEXT NOT NULL DEFAULT '',       -- Ort / Gemeinde
  series       TEXT NOT NULL DEFAULT '',       -- Reihe
  main_ref     TEXT NOT NULL DEFAULT '',       -- Haupttext, wie eingegeben
  summary      TEXT NOT NULL DEFAULT '',       -- Kurzbeschreibung
  content_json TEXT NOT NULL,                  -- Tiptap-Dokument
  plain_text   TEXT NOT NULL DEFAULT '',
  word_count   INTEGER NOT NULL DEFAULT 0,
  favorite     INTEGER NOT NULL DEFAULT 0,
  archived_at  INTEGER,
  deleted_at   INTEGER,                        -- Papierkorb
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX documents_updated ON documents (updated_at DESC);
CREATE INDEX documents_deleted ON documents (deleted_at);

CREATE TABLE document_versions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id  TEXT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content_json TEXT NOT NULL,
  word_count   INTEGER NOT NULL DEFAULT 0,
  reason       TEXT NOT NULL,                  -- auto | manuell | wiederhergestellt
  created_at   INTEGER NOT NULL
);
CREATE INDEX document_versions_doc ON document_versions (document_id, created_at DESC);

CREATE TABLE topics (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  parent_id  TEXT REFERENCES topics (id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE document_topics (
  document_id TEXT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  topic_id    TEXT NOT NULL REFERENCES topics (id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, topic_id)
);
CREATE INDEX document_topics_topic ON document_topics (topic_id);

CREATE TABLE document_tags (
  document_id TEXT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  name        TEXT NOT NULL COLLATE NOCASE,
  PRIMARY KEY (document_id, name)
);

-- source: main (Haupttext) | block (Bibelstellen-Block) | text (im Fließtext erkannt)
CREATE TABLE bible_refs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  book        INTEGER NOT NULL,
  start_id    INTEGER NOT NULL,
  end_id      INTEGER NOT NULL,
  source      TEXT NOT NULL
);
CREATE INDEX bible_refs_range ON bible_refs (start_id, end_id);
CREATE INDEX bible_refs_doc ON bible_refs (document_id);
