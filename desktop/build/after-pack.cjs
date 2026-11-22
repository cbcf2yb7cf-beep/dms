// Nach dem Packen, vor der DMG:
// 1. Server (../.next/standalone) vollständig nach Contents/Resources/server kopieren.
//    Nicht über extraResources: electron-builder lässt dabei Teile von node_modules weg.
// 2. App ad hoc signieren (ohne Apple-Entwicklerkonto) und streng prüfen.
//    Apps für Apple-Chips starten nur mit gültiger Signatur; electron-builder selbst signiert nicht (identity: null).
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);

  const source = path.join(__dirname, "..", "..", ".next", "standalone");
  const target = path.join(app, "Contents", "Resources", "server");
  if (!fs.existsSync(path.join(source, "server.js"))) throw new Error(`Server fehlt: ${source}`);
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true, dereference: true });
  for (const needed of ["server.js", ".next/BUILD_ID", "node_modules/next/package.json", "node_modules/better-sqlite3/prebuilds/darwin-arm64.node", "src/db/migrations", "bible/bible.db"]) {
    if (!fs.existsSync(path.join(target, needed))) throw new Error(`Im App-Paket fehlt: server/${needed}`);
  }
  console.log(`  • Server kopiert: ${target}`);

  console.log(`  • ad-hoc-Signatur: ${app}`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", app], { stdio: "inherit" });
  execFileSync("codesign", ["--verify", "--deep", "--strict", "--verbose=2", app], { stdio: "inherit" });
};
