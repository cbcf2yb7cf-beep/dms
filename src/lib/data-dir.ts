import "server-only";
import { dirname, join, resolve } from "node:path";

/** Ordner für Datenbank und Dateien: Mac-App → Application Support/DMS, sonst neben der Datenbank. */
export function dataDir(): string {
  return resolve(/* turbopackIgnore: true */ process.env.DMS_DATA_DIR || dirname(process.env.DATABASE_PATH ?? "./data/app.db"));
}

export const originalsDir = () => join(dataDir(), "originals");
