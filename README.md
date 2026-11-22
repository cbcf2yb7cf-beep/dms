# DMS – Predigten, Vorträge, Bibel & Präsentationen

Private Web-App zum Verwalten von Predigten und Vorträgen, mit freier Bibel
(Konkordanz, Grundtext), Präsentationen und optionalem Claude-Assistenten.
Vollständiger Plan: [docs/PLAN.md](docs/PLAN.md).

**Live (Vorschau):** https://dms.hausundrasen.de

## Stand

| Phase | Inhalt | Status |
|---|---|---|
| 1 | Grundgerüst, Design, Login + 2FA, Dashboard, ausklappbare Navigation, ⌘K | ✅ |
| – | Mac-App (DMG) über GitHub Actions | ✅ |
| 2 | Archiv & Editor (Tiptap), Versionen, Papierkorb, Bibelstellen-Erkennung, Filter, ⌘K-Dokumentsuche | ✅ |
| 3 | Import (DOCX, PDF/OCR, PPTX, ältere Formate) | offen |
| 4 | Bibelzentrum (freie Übersetzungen, Konkordanz, Strong) | offen |
| 5 | Suche & Themennetz | offen |
| 6 | Präsentationen + PWA/offline | offen |
| 7 | Claude-Assistent | offen |

## Technik

- Next.js (App Router, TypeScript strict), Tailwind CSS 4, lucide-react
- SQLite über better-sqlite3 + Drizzle; Migrationen von Hand in `src/db/migrations/*.sql`
  (laufen beim Start, siehe `src/instrumentation.ts`)
- NextAuth (Credentials, JWT), TOTP-2FA mit Notfall-Codes, Login-Bremse je Konto/IP
- Docker hinter Traefik (`dynamic.yml`), Daten im Volume `dms_data` → `/data/app.db`
  (Endung `.db`, damit das restic-Server-Backup die Datei konsistent sichert)

## Betrieb

```bash
cp .env.example .env   # Werte setzen
docker compose up -d --build
```

Tests und Typprüfung (auf dem Server ohne lokales Node):

```bash
docker run --rm -v "$PWD":/app -w /app node:22-alpine sh -c "npx tsc --noEmit && npx vitest run"
```

`ADMIN_EMAIL`/`ADMIN_PASSWORD` legen nur beim allerersten Start den Benutzer an;
danach Passwort in den Einstellungen ändern.

## Mac-App (DMG)

DMS gibt es zusätzlich als eigenständige Mac-App für Apple-Chips (M1–M4): ohne Server,
ohne Internet, ohne Login. Daten liegen in `~/Library/Application Support/DMS`
(`app.db`, später Originaldateien); sie bleiben bei Updates erhalten. Server-Version und
Mac-App haben **getrennte** Datenbestände.

- `desktop/main.js` – Electron-Hülle: startet den Next.js-Server (`output: "standalone"`,
  gebaut mit `DMS_DESKTOP=1`) als Hilfsprozess nur auf `127.0.0.1` mit freiem Port und
  öffnet ihn im App-Fenster.
- Schutz: Pro Start ein zufälliger Schlüssel (`DMS_LOCAL_TOKEN`), den nur das App-Fenster
  als Cookie bekommt; ohne ihn antwortet der Server mit 403 (`src/proxy.ts`). Kein Login nötig.
- `better-sqlite3` nutzt Node-API mit mitgelieferten Binärdateien – läuft ohne Neukompilieren in Electron.
- Gebaut wird auf GitHub Actions (`.github/workflows/desktop.yml`, macOS arm64) inkl. Probelauf
  der fertigen App. Neue Version: Tag `desktop-vX.Y.Z` pushen → Release mit DMG.
- Die App ist ad-hoc signiert (kein Apple-Entwicklerkonto): beim ersten Start
  *Systemeinstellungen → Datenschutz & Sicherheit → „Dennoch öffnen“*.

Lokal testen ohne DMG (auf einem Mac): `DMS_DESKTOP=1 npm run build && node desktop/prepare.mjs && cd desktop && npm install && npm start`.
