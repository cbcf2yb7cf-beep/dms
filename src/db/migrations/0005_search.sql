-- Phase 5: Volltextsuche über Dokumente. Gespeichert werden Wortstämme (deutsch, Snowball),
-- befüllt von der App (src/lib/search). doc_id = documents.id.
CREATE VIRTUAL TABLE docs_fts USING fts5(
  doc_id UNINDEXED,
  title,
  body,
  meta,
  tokenize = "unicode61 remove_diacritics 2"
);
