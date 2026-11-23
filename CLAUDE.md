# DMS – Hinweise für Claude Code

Private App für Predigten, Vorträge, Bibel und Präsentationen von Sascha. Genutzt wird sie als
**Mac-App** (Electron, Apple-Chip). Die Server-Version (Docker/Traefik, Login + 2FA) bleibt im Code,
ist aber nicht in Betrieb. Ausführlicher Stand: `README.md`, ursprünglicher Plan: `docs/PLAN.md`.

## Sprache & Stil
- Oberfläche, Kommentare, Commit-Nachrichten: **Deutsch**. Nicht gendern.
- Antworten an Sascha auf Deutsch, verständlich für Nicht-Entwickler.

## Technik
- Next.js 16 (App Router, TypeScript strict), Tailwind 4 (eigene Bausteine in `src/app/globals.css`, kein shadcn).
- SQLite über better-sqlite3 + Drizzle. **Migrationen von Hand** in `src/db/migrations/NNNN_*.sql`,
  laufen beim Start (`src/instrumentation.ts`). Alte Migrationen nie ändern, immer eine neue anlegen;
  `src/db/schema.ts` parallel pflegen; Anzahl in `src/db/migrate.test.ts` anpassen.
- `data/bible.db` (nur lesend) erzeugt `npm run bibel` aus freien Quellen (`scripts/bible/sources.mjs`).
  Nur gemeinfreie/frei lizenzierte Übersetzungen – Lizenzen dort dokumentiert, **kein API.Bible**.
- Suche: FTS5-Tabelle `docs_fts` mit deutschen Wortstämmen (`src/lib/search`).
- Mac-App: `desktop/` (main.js, preload.js, prepare.mjs, build/after-pack.cjs). Lokal-Modus über
  `DMS_LOCAL_TOKEN` (Cookie pro Start, `src/proxy.ts`, `src/lib/local.ts`) – kein Login.
- Claude-Assistent: `src/lib/ai`. Standardmodell `claude-opus-5-5`, wählbar Sonnet/Haiku 5.5.
  Immer zweistufig: `prepare()` ohne API-Aufruf, `run()` nur nach Bestätigung. Ergebnisse nie automatisch übernehmen.

## Regeln aus Erfahrung
- Server Actions im Client nie mit `.bind()` im Render; Formulare mit `useActionState` und versteckten Feldern.
- Sortierungen nach Zeitstempel **immer mit Gleichstands-Regel** (id/rowid) – der Mac-Build-Rechner ist so
  schnell, dass Einträge in derselben Millisekunde entstehen. Zeitstempel für Konfliktschutz steigen streng.
- Dynamische Dateipfade mit `/* turbopackIgnore: true */` markieren, sonst Build-Warnungen.
- Prüfen vor jedem Commit: `npm run typecheck` und `npm test`. Bei Tests auf **„Test Files … passed“** achten,
  nicht nur auf die Testanzahl (eine Datei kann sonst unbemerkt gar nicht laufen).
- Keine Geheimnisse ins Repo (.env*, Schlüssel). Der Claude-Schlüssel liegt in der Mac-App im Schlüsselbund.

## Befehle
- `npm run dev` – Entwicklung im Browser (http://localhost:3000, Login aus `.env.local`)
- `npm run bibel` – Bibeldaten bauen (einmalig, ~15 s, lädt ~120 MB Quellen in `.bible-cache/`)
- `npm test`, `npm run typecheck`
- `npm run mac-app` – echte Mac-App lokal starten (ohne DMG)

## Neue Version der Mac-App veröffentlichen
1. Änderungen committen und pushen (`main`).
2. Tag setzen: `git tag desktop-vX.Y.Z && git push origin desktop-vX.Y.Z`
3. GitHub Actions baut auf einem Mac-Rechner, testet und legt die DMG unter **Releases** ab.
   Bei Fehlern steht in der Zusammenfassung des Laufs ein Abschnitt „Fehlerbericht“.

## Daten
Saschas echte Daten liegen NICHT im Repo, sondern in `~/Library/Application Support/DMS`
(app.db, originals/, media/). Für die Entwicklung wird `./data/` benutzt (nicht eingecheckt).
