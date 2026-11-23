import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "./migrate";

describe("Migrationen", () => {
  it("laufen auf leerer DB und sind wiederholbar", () => {
    const sqlite = new Database(":memory:");
    runMigrations(sqlite);
    runMigrations(sqlite);
    const tables = (sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[]).map((t) => t.name);
    expect(tables).toEqual(expect.arrayContaining(["_migrations", "login_throttle", "users"]));
    expect(sqlite.prepare("SELECT count(*) AS n FROM _migrations").get()).toEqual({ n: 7 });
    expect(tables).toEqual(expect.arrayContaining(["documents", "document_versions", "topics", "bible_refs"]));
  });

  it("hat FTS5 zur Verfügung (für Phase 2/5)", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec("CREATE VIRTUAL TABLE t USING fts5(body, tokenize='unicode61 remove_diacritics 2')");
    sqlite.prepare("INSERT INTO t VALUES (?)").run("Gnade und Barmherzigkeit");
    expect(sqlite.prepare("SELECT count(*) AS n FROM t WHERE t MATCH 'gnade'").get()).toEqual({ n: 1 });
  });
});
