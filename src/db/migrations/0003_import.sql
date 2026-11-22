-- Phase 3: Import und Originaldateien.
CREATE TABLE document_files (
  id            TEXT PRIMARY KEY,
  document_id   TEXT REFERENCES documents (id) ON DELETE CASCADE,
  sha256        TEXT NOT NULL,
  file_name     TEXT NOT NULL,                 -- Originalname
  rel_path      TEXT NOT NULL DEFAULT '',      -- Pfad im importierten Ordner
  ext           TEXT NOT NULL,
  size          INTEGER NOT NULL,
  import_job_id TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX document_files_sha ON document_files (sha256);
CREATE INDEX document_files_doc ON document_files (document_id);

CREATE TABLE import_jobs (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,                   -- z. B. Name des gewählten Ordners
  total       INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  finished_at INTEGER,
  undone_at   INTEGER
);

-- status: importiert | doppelt | uebersprungen | fehler
CREATE TABLE import_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id      TEXT NOT NULL REFERENCES import_jobs (id) ON DELETE CASCADE,
  path        TEXT NOT NULL,
  status      TEXT NOT NULL,
  message     TEXT NOT NULL DEFAULT '',
  document_id TEXT REFERENCES documents (id) ON DELETE SET NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX import_items_job ON import_items (job_id);
