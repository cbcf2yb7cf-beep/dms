import "server-only";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";
import { runMigrations } from "./migrate";

type DB = BetterSQLite3Database<typeof schema>;

// Eine Verbindung pro Prozess (auch über Hot-Reload hinweg), erst beim ersten Zugriff.
const globalForDb = globalThis as unknown as { dmsDb?: DB };

function open(): DB {
  const path = process.env.DATABASE_PATH ?? "./data/app.db";
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  runMigrations(sqlite);
  return drizzle(sqlite, { schema });
}

export function db(): DB {
  globalForDb.dmsDb ??= open();
  return globalForDb.dmsDb;
}
