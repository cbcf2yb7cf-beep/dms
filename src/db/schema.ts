import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Spiegelt die SQL-Migrationen in ./migrations. Migrationen werden bewusst
// von Hand geschrieben (FTS5-Tabellen und Trigger folgen in Phase 2/5).

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["ADMIN", "USER"] }).notNull().default("ADMIN"),
  totpSecret: text("totp_secret"),
  totpPendingSecret: text("totp_pending_secret"),
  totpEnabledAt: integer("totp_enabled_at", { mode: "timestamp_ms" }),
  totpLastStep: integer("totp_last_step"),
  totpRecovery: text("totp_recovery"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const loginThrottle = sqliteTable("login_throttle", {
  key: text("key").primaryKey(),
  failures: integer("failures").notNull().default(0),
  lockCount: integer("lock_count").notNull().default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type User = typeof users.$inferSelect;

// ── Phase 2: Dokumente ──────────────────────────────────────────────────────

export const DOC_TYPES = ["predigt", "vortrag", "bibelstudie", "andacht", "notiz"] as const;
export type DocType = (typeof DOC_TYPES)[number];
export const DOC_STATUS = ["entwurf", "fertig", "gehalten"] as const;
export type DocStatus = (typeof DOC_STATUS)[number];

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  type: text("type", { enum: DOC_TYPES }).notNull(),
  title: text("title").notNull().default(""),
  status: text("status", { enum: DOC_STATUS }).notNull().default("entwurf"),
  heldOn: text("held_on"),
  occasion: text("occasion").notNull().default(""),
  place: text("place").notNull().default(""),
  series: text("series").notNull().default(""),
  mainRef: text("main_ref").notNull().default(""),
  summary: text("summary").notNull().default(""),
  contentJson: text("content_json").notNull(),
  plainText: text("plain_text").notNull().default(""),
  wordCount: integer("word_count").notNull().default(0),
  favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
export type Document = typeof documents.$inferSelect;

export const documentVersions = sqliteTable("document_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: text("document_id").notNull(),
  title: text("title").notNull(),
  contentJson: text("content_json").notNull(),
  wordCount: integer("word_count").notNull().default(0),
  reason: text("reason", { enum: ["auto", "manuell", "wiederhergestellt"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const topics = sqliteTable("topics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  parentId: text("parent_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const documentTopics = sqliteTable("document_topics", {
  documentId: text("document_id").notNull(),
  topicId: text("topic_id").notNull(),
});

export const documentTags = sqliteTable("document_tags", {
  documentId: text("document_id").notNull(),
  name: text("name").notNull(),
});

export const bibleRefs = sqliteTable("bible_refs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: text("document_id").notNull(),
  book: integer("book").notNull(),
  startId: integer("start_id").notNull(),
  endId: integer("end_id").notNull(),
  source: text("source", { enum: ["main", "block", "text"] }).notNull(),
});
