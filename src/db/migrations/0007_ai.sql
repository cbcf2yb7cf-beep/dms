-- Phase 7: Einstellungen und Protokoll der Claude-Aufrufe.
CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE ai_runs (
  id            TEXT PRIMARY KEY,
  task          TEXT NOT NULL,
  model         TEXT NOT NULL,
  document_ids  TEXT NOT NULL DEFAULT '[]',
  question      TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL,            -- ok | abgelehnt | fehler
  result        TEXT NOT NULL DEFAULT '',
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd      REAL NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);
CREATE INDEX ai_runs_created ON ai_runs (created_at DESC);
