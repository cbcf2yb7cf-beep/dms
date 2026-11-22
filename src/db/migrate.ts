import type Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// turbopackIgnore: Migrationen zur Laufzeit lesen, nicht das ganze Projekt in den Build ziehen.
const DIR = join(/* turbopackIgnore: true */ process.cwd(), "src", "db", "migrations");

/** Spielt alle noch fehlenden *.sql-Dateien in Namensreihenfolge ein, jede in einer Transaktion. */
export function runMigrations(sqlite: Database.Database, dir = DIR) {
  sqlite.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)");
  const done = new Set(
    (sqlite.prepare("SELECT name FROM _migrations").all() as { name: string }[]).map((r) => r.name),
  );
  const files = readdirSync(/* turbopackIgnore: true */ dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = readFileSync(/* turbopackIgnore: true */ join(dir, file), "utf8");
    sqlite.transaction(() => {
      sqlite.exec(sql);
      sqlite.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(file, Date.now());
    })();
    console.info(`[db] Migration ${file} eingespielt`);
  }
}
