// Macht .next/standalone zur lauffähigen Server-Kopie für die Mac-App:
// statische Dateien, public/, SQL-Migrationen und better-sqlite3 hinein.
// Aufruf aus dem Projektordner nach `DMS_DESKTOP=1 npm run build`.
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sa = join(root, ".next", "standalone");
if (!existsSync(join(sa, "server.js"))) throw new Error("Kein .next/standalone – erst mit DMS_DESKTOP=1 bauen.");

cpSync(join(root, ".next", "static"), join(sa, ".next", "static"), { recursive: true });
cpSync(join(root, "public"), join(sa, "public"), { recursive: true });
cpSync(join(root, "src", "db", "migrations"), join(sa, "src", "db", "migrations"), { recursive: true });

// better-sqlite3 komplett übernehmen. Es nutzt Node-API und bringt fertige Binärdateien
// (prebuilds/<plattform>.node) mit – die laufen unverändert in Node und in Electron.
const target = join(sa, "node_modules", "better-sqlite3");
rmSync(target, { recursive: true, force: true });
cpSync(join(root, "node_modules", "better-sqlite3"), target, { recursive: true });
for (const junk of ["deps", "src", "build"]) rmSync(join(target, junk), { recursive: true, force: true });
if (process.platform === "darwin") {
  // In der Mac-App nur die Datei für Apple-Chips behalten.
  for (const f of readdirSync(join(target, "prebuilds"))) if (f !== "darwin-arm64.node") rmSync(join(target, "prebuilds", f));
}
const needed = process.platform === "darwin" ? "darwin-arm64.node" : readdirSync(join(target, "prebuilds"))[0];
if (!needed || !existsSync(join(target, "prebuilds", needed))) throw new Error("better-sqlite3: keine passende Binärdatei");

// Sicherheitshalber keine .env-Dateien in die App packen.
for (const f of readdirSync(sa)) if (f.startsWith(".env")) rmSync(join(sa, f));

console.log("standalone vorbereitet:", sa);
