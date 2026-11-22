-- Phase 4: Lesezeichen und Notizen zu Bibelversen (Vers-ID BBCCCVVV, unabhängig von der Übersetzung).
CREATE TABLE bookmarks (
  verse_id   INTEGER PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE verse_notes (
  verse_id   INTEGER PRIMARY KEY,
  text       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
