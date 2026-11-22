# Plan: DMS – Predigten, Vorträge, Bibel & Präsentationen

## Context
Sascha möchte eine eigene Web-App, um Predigten und Vorträge zu verwalten, schnell zu finden, wo welche Themen und Bibelstellen behandelt wurden, daraus Präsentationen zu machen und eine Onlinebibel mit freien Übersetzungen, Konkordanz und Grundtext zu nutzen. Die KI-Unterstützung läuft über die Claude-API, sicher und nur auf seine Freigabe hin.

Getroffene Entscheidungen:
- **Betrieb:** auf dem eigenen Server wie die anderen Projekte (Docker, Traefik, Login mit 2FA). Zusätzlich offline nutzbar als installierbare Web-App (PWA).
- **Import:** DOCX, PDF (auch gescannt), PowerPoint/Keynote, Pages und ältere Formate.
- **Bibel:** freie deutsche und englische Übersetzungen, Konkordanz, Querverweise und Grundtext mit Strong-Nummern.
- **Präsentieren:** direkt aus der App mit Referentenansicht, dazu Export als PPTX und PDF.

## Bewertung der beiden Vorschläge

| Punkt | Gemini | ChatGPT | Entscheidung |
|---|---|---|---|
| Plattform | Next.js lokal ✅ | Tauri 2 + Rust ❌ (Mac-only, Signierung, kann auf dem Server nicht gebaut oder getestet werden) | Next.js auf dem Server, dazu eine PWA |
| Suche | SQLite FTS5 ✅ | FTS5 und später semantische Suche ✅ | FTS5 mit deutscher Wortstamm-Suche, Embeddings erst später |
| Dokumente | Markdown-Dateien ⚠️ (nur für den Betrieb rein lokal sinnvoll) | DB plus Originaldateien ✅ | DB plus unveränderte Originale; Markdown nur als Export |
| Bibelquelle | helloao/eBible ✅ | **API.Bible ❌**: Offline-Speichern ist nicht erlaubt, KI-Nutzung eingeschränkt, Schlüssel und Limits nötig | Freie Datensätze lokal importieren, kein API.Bible |
| Grundtext | Strong ✅ | als „Erweiterung“ ⚠️ | Wird gemacht, mit freien Daten (STEPBible, OpenScriptures) |
| KI | „Claude Code“ per MCP ⚠️ (Claude Code ist ein Entwickler-Werkzeug, kein App-Backend) | Anthropic API serverseitig ✅, Schlüssel im Keychain (passt nicht zum Server) | Anthropic Messages API serverseitig, Schlüssel in `.env`; optional später ein MCP-Server zum Lesen |
| Präsentation | Reveal/Marp ⚠️ | kompletter Folieneditor ⚠️ (zu groß) | Strukturierte Folien-Bausteine mit Themes, Vollbild plus Referentenansicht, PPTX per pptxgenjs |
| Umfang | zu knapp | 9 Phasen, sehr breit | 7 Phasen, jede für sich lauffähig |

**Die größten Fehler in ChatGPTs Plan:** API.Bible als Bibelquelle und Tauri als Plattform. **Bei Gemini fehlen** Import, Login und Sicherheit auf dem Server sowie das Thema Backup.

## Architektur
- **Ordner:** `/opt/dms`, eigenes Git-Repo, eine Vorschau-Subdomain (z. B. `dms.hausundrasen.de`, wird noch festgelegt).
- **Stack:** Next.js (App Router, TypeScript strict), Tailwind und shadcn/ui, **better-sqlite3 mit Drizzle**. Prisma passt hier nicht: Die FTS5-Tabellen erzeugen bei Prisma ständig eine Schema-Abweichung (Drift).
- **Zwei Datenbanken:**
  - `data/app.db`: Dokumente, Themen, Folien und Nutzer (Lesen und Schreiben)
  - `data/bible.sqlite`: Bibeltexte, Strong-Lexikon, Querverweise und Lizenzen. Nur lesbar und per Import-Skript neu erzeugbar.
- **Dateien:** `data/originals/<sha256>` (Originale werden nie verändert), `data/media/` (Bilder für Folien).
- **Docker:** ein App-Container mit Volume `data/`. Daneben ein Hilfscontainer für Konvertierungen (LibreOffice headless und ocrmypdf/tesseract-deu), der nur bei Bedarf läuft. Laut Serverlast-Regel laufen keine schweren Jobs parallel; OCR wird deshalb nacheinander abgearbeitet.
- **Traefik:** neuer Eintrag in `dynamic.yml` nach der Feedback-Regel: erst eine Sicherung anlegen, dann gezielt editieren, nie überschreiben.
- **Backup:** `data/` in das bestehende restic-OneDrive-Backup aufnehmen (`/opt/server-backup`) und den Eintrag im Orga-Monitoring prüfen.
- **Wiederverwenden:**
  - Login-Bremse und 2FA nach dem Muster aus `/opt/orga`
  - Claude-Aufrufe nach dem Muster aus `/opt/kochbuch` und `/opt/orga` (Rezept- bzw. Termin-Erfassung)
  - die bind()-Regel bei Server Actions (useActionState, nie im Client binden)

## Datenmodell (Kern)
- `documents`: Typ (Predigt, Vortrag, Bibelstudie, Andacht, Notiz), Titel, Datum, Anlass/Ort, Reihe, Status, `content_json` (Tiptap), `plain_text`, Favorit, archiviert
- `document_versions`: Schnappschüsse, höchstens einer alle 5 Minuten plus beim manuellen Speichern
- `document_files`: Original, sha256, MIME-Typ, Herkunft, Import-Job
- `topics` (hierarchisch, z. B. Gnade → Rechtfertigung), `document_topics`, `tags`
- `bible_refs`: document_id, Buch, Start-Vers-ID, End-Vers-ID. Verse als Integer `BBCCCVVV`, damit Bereichsabfragen wie „alle Predigten zu Röm 8“ ein einfaches `BETWEEN` sind.
- `presentations`, `slides`: Typ (Titel, Bibelvers, Punkte, Zitat, Bild, Leer), JSON-Inhalt, Reihenfolge, Theme
- `ai_runs`: Aktion, gesendete Quellen, Antwort, Kosten. Getrennt von den Dokumenten gespeichert.
- `import_jobs`, `bookmarks`, `verse_notes`, `settings`
- FTS5: `docs_fts` (Titel, Text, Tags) mit `unicode61 remove_diacritics 2` plus eine zweite Spalte mit deutschen Snowball-Wortstämmen („Vergebung“ findet „vergeben“). Gepflegt wird sie durch die App beim Speichern.

## Bibeldaten (Lizenzen werden in Phase 4 je Quelle geprüft und im UI angezeigt)
- **Deutsch:** Luther 1912, Elberfelder 1905, Schlachter 1951 (gemeinfrei-Status prüfen), weitere gemeinfreie Ausgaben aus eBible.org/helloao
- **Englisch:** KJV (mit Strong-Nummern), WEB, BSB, ASV
- **Grundtext:** STEPBible TAHOT/TAGNT (CC BY 4.0, mit Morphologie und Strong-Nummern), OpenScriptures Hebrew Bible, SBLGNT; Strong-Lexikon (gemeinfrei)
- **Querverweise:** OpenBible.info (CC BY)
- **Nicht frei** (gehören nicht dazu): Luther 2017, Elberfelder 2006, Schlachter 2000, Hoffnung für alle, NGÜ
- Die Import-Skripte (`scripts/bible/*.ts`) laden feste Versionen, prüfen sie und schreiben `bible.sqlite`. Zu jeder Übersetzung gibt es einen Lizenzdatensatz (Quelle, Lizenz, Pflicht-Hinweis, ob die Weitergabe an KI erlaubt ist).

## Phasen (jede endet mit einem Deployment, einem Git-Commit und einem Test)

**1. Grundgerüst und Design**
- Next.js, Tailwind und shadcn, Login mit 2FA, Sidebar (Start, Archiv, Bibel, Themen, Präsentationen, Assistent, Einstellungen), Suche mit ⌘K
- Design: warmes Papier für helles Lesen, Anthrazit mit Goldakzent für dunkel; eine Serifenschrift für Texte, eine serifenlose für die Oberfläche
- Docker, Traefik, Vorschau-URL. Vorher ein Design-Mockup zur Abstimmung.

**2. Archiv und Editor**
- Dokumente anlegen, bearbeiten, archivieren und löschen (mit Papierkorb)
- Tiptap mit Gliederung, Bibelstellen-Block, Zitat und Notiz; automatisches Speichern, Versionsverlauf
- Themen und Tags, Filter und Sortierung, Dashboard (zuletzt bearbeitet, Favoriten, Statistik)
- **Bibelstellen-Parser:** erkennt „Hebr 11,1-3; Joh 3,16f“ und alle deutschen und englischen Buchkürzel und speichert sie automatisch in `bible_refs`. Dazu Unit-Tests mit vielen Schreibweisen.

**3. Import**
- Assistent für einzelne Dateien, mehrere Dateien und ZIP/Ordner, Doppelte werden per sha256 erkannt
- DOCX → mammoth; PDF → pdfjs-dist; PPTX → Text der Folien per jszip
- DOC/RTF/ODT → LibreOffice headless → DOCX
- Pages/Keynote: Anleitung für den Stapel-Export am Mac nach DOCX/PPTX (das Pages-Format lässt sich nicht verlässlich lesen). Optional wird die Vorschau-PDF aus dem Pages-Paket gelesen.
- Gescannte PDFs → OCR in einer Warteschlange (ocrmypdf deu)
- Titel und Datum werden vorgeschlagen, Bibelstellen automatisch erkannt; Vorschau vor dem Speichern, Import-Protokoll
- Test mit 5–10 echten Predigten

**4. Bibelzentrum**
- Import-Skripte und `bible.sqlite`
- Leser mit Buch, Kapitel und Vers sowie bis zu 3 Übersetzungen parallel
- Konkordanz: alle Vorkommen eines Wortes mit Treffern pro Buch und Sprung in den Kontext
- Strong-Panel: Grundwort, Umschrift, Bedeutung, alle Vorkommen. Über KJV/BSB/STEP verknüpft; gibt es einen freien deutschen Datensatz mit Strong-Nummern, wird er ergänzt.
- Querverweise, Lesezeichen, Versnotizen
- „Wo habe ich darüber gepredigt?“ über `bible_refs`
- Verse per Klick in den Editor oder auf eine Folie übernehmen

**5. Suche und Themennetz**
- Globale Suche über Dokumente, Bibel und Notizen mit Hervorhebung, Textausschnitt und Sprung zur Fundstelle
- Filter nach Typ, Jahr, Thema und Bibelstelle
- Themenseiten, die alle verknüpften Predigten und Stellen zeigen
- Tests für Umlaute, Wortformen und Bibelstellen-Suche

**6. Präsentationen**
- Folien-Bausteine mit 3–4 Themes, Bibelvers-Folie mit Quellenangabe
- Entwurf aus der Gliederung einer Predigt
- Vollbild-Präsentation mit Tastatur und Fernbedienung; Referentenansicht im zweiten Fenster (BroadcastChannel) mit Notizen, nächster Folie und Uhr
- Export als PPTX (pptxgenjs) und PDF (Druck-CSS)
- **PWA/offline:** App-Shell und markierte Präsentationen, Dokumente und gewählte Übersetzungen werden im Browser zwischengespeichert. Offline kann man lesen und präsentieren; bearbeitet wird online.

**7. Claude-Assistent**
- Anthropic Messages API nur serverseitig, Schlüssel in `.env`
- Aktionen auf einer festen Liste: zusammenfassen, Themen und Bibelstellen vorschlagen, Gliederung erstellen, zwei Predigten vergleichen, Folienentwurf, Archivfrage
- **Archivfrage:** Zuerst sucht FTS lokal nach Treffern. Erst nach einer Vorschau, was gesendet wird, und deiner Bestätigung gehen nur diese Ausschnitte an Claude. Die Antwort kommt mit Quellenangaben (Titel, Datum, Fundstelle).
- Vorschläge werden nie automatisch übernommen, sondern erscheinen als Diff oder Vorschlag mit „Übernehmen“
- Kostenanzeige pro Aufruf; Modellwahl in den Einstellungen (Standard Sonnet, Opus für große Analysen)
- Optional später: ein MCP-Server mit Token, der nur lesen darf, damit Claude Code in VS Code das Archiv durchsuchen kann

**Später:** semantische Suche (sqlite-vec plus Embeddings), Predigtkalender bzw. „wann zuletzt gehalten“, Audio-Anhänge.

**MVP für den echten Einsatz:** Phasen 1–5. Danach 6, dann 7.

## Sicherheit
- Login mit 2FA und Login-Bremse; alle Routen sind geschützt, auch Dateien und Medien
- Uploads: Größenlimit, MIME- und Magic-Byte-Prüfung, Speicherung außerhalb von `public`
- API-Schlüssel nur in `.env` (steht in `.gitignore`), niemals im Client
- Vor jedem KI-Aufruf eine Vorschau mit Bestätigung; es werden nie ganze Archive gesendet
- Löschen über einen Papierkorb; Originale sind unveränderlich
- Lizenzen pro Übersetzung im UI und in `bible.sqlite`

## Verifikation (pro Phase)
- `npm run build`, `npm test` (Vitest: Bibelstellen-Parser, FTS mit Umlauten und Wortstämmen, Import mit Beispieldateien, CRUD)
- Container neu bauen und Vorschau-URL aufrufen; per curl prüfen, dass Login, 2FA und Datei-Routen ohne Session mit 401/Weiterleitung antworten
- **Phase 3:** echte Predigten importieren; Text, Bibelstellen und Doppel-Erkennung prüfen
- **Phase 4:** Stichproben gegen die gedruckte Bibel (Verszählung, Psalmen-Überschriften, Röm 16,25–27); Konkordanz-Zahlen gegen bekannte Werte prüfen
- **Phase 6:** Präsentation auf Mac und Beamer, Referentenansicht, PPTX in PowerPoint/Keynote öffnen, Offline-Test im Flugmodus
- **Phase 7:** Prüfen, dass ohne Bestätigung nichts gesendet wird; Quellenangaben müssen auf echte Fundstellen führen
- Nach dem Deployment: restic-Backup enthält `data/`; Traefik-`dynamic.yml` vorher gesichert und mit diff geprüft

## Zuerst als Nächstes
Phase 1 mit Design-Mockup. Die Subdomain lege ich mit dir fest, bevor der Traefik-Eintrag angelegt wird.
