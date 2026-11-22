# DMS – Predigten, Vorträge, Bibel & Präsentationen

Private Web-App zum Verwalten von Predigten und Vorträgen, mit freier Bibel
(Konkordanz, Grundtext), Präsentationen und optionalem Claude-Assistenten.
Vollständiger Plan: [docs/PLAN.md](docs/PLAN.md).

**Live (Vorschau):** https://dms.hausundrasen.de

## Stand

| Phase | Inhalt | Status |
|---|---|---|
| 1 | Grundgerüst, Design, Login + 2FA, Dashboard, ausklappbare Navigation, ⌘K | ✅ |
| 2 | Archiv & Editor, Bibelstellen-Erkennung | offen |
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
