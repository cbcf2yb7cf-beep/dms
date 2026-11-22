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
