"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { FileUp, FolderOpen, Square } from "lucide-react";
import { extOf, isJunk, planImport } from "@/lib/import/formats";

type Picked = { file: File; path: string };
type Counts = { importiert: number; doppelt: number; uebersprungen: number; fehler: number };
const ZERO: Counts = { importiert: 0, doppelt: 0, uebersprungen: 0, fehler: 0 };
const PARALLEL = 3;

const pathOf = (f: File) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;

export function Importer() {
  const router = useRouter();
  const folderInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [label, setLabel] = useState("");
  const [topics, setTopics] = useState(true);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [counts, setCounts] = useState<Counts>(ZERO);
  const [current, setCurrent] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const plan = useMemo(() => planImport(picked.map((p) => p.path)), [picked]);
  const toImport = plan.filter((p) => p.action === "import");
  const toSkip = plan.filter((p) => p.action === "skip");
  const byExt = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of toImport) m.set(extOf(p.path), (m.get(extOf(p.path)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [toImport]);

  function choose(list: FileList | null, fromFolder: boolean) {
    if (!list?.length) return;
    const files = [...list].filter((f) => !isJunk(f.name));
    // Gemeinsamen obersten Ordner abschneiden ("Wortbeiträge/Predigten/x.docx" → "Predigten/x.docx"), Name wird Bezeichnung.
    const paths = files.map(pathOf);
    const root = fromFolder ? paths[0]?.split("/")[0] ?? "" : "";
    setLabel(fromFolder ? root : files.length === 1 ? files[0].name : `${files.length} Dateien`);
    setPicked(files.map((file, i) => ({ file, path: fromFolder && root ? paths[i].slice(root.length + 1) : paths[i] })));
    setDone(0);
    setCounts(ZERO);
    setJobId(null);
    setError(null);
  }

  async function start() {
    setRunning(true);
    setError(null);
    cancelRef.current = false;
    const tally = { ...ZERO };
    try {
      const res = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, total: plan.length }) });
      if (!res.ok) throw new Error("Import konnte nicht gestartet werden");
      const { id } = (await res.json()) as { id: string };
      setJobId(id);

      // Übersprungene gleich protokollieren (gehen schnell).
      for (const s of toSkip) {
        await fetch(`/api/import/${id}/ueberspringen`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: s.path, status: "uebersprungen", message: s.reason }) });
        tally.uebersprungen++;
      }
      setCounts({ ...tally });
      setDone(toSkip.length);

      const byPath = new Map(picked.map((p) => [p.path, p.file]));
      const queue = toImport.map((p) => p.path);
      let finished = toSkip.length;
      const worker = async () => {
        while (queue.length && !cancelRef.current) {
          const path = queue.shift()!;
          setCurrent(path);
          let status: keyof Counts = "fehler";
          try {
            const r = await fetch(`/api/import/${id}/datei`, {
              method: "POST",
              headers: { "x-dms-pfad": encodeURIComponent(path), "x-dms-themen": topics ? "1" : "0", "Content-Type": "application/octet-stream" },
              body: byPath.get(path)!,
            });
            const data = await r.json();
            status = r.ok && data.status in ZERO ? data.status : "fehler";
            if (!r.ok) throw new Error(data.error ?? `Fehler ${r.status}`);
          } catch (e) {
            // Datei nicht lesbar (z. B. OneDrive „nur online“) oder Server-Fehler: protokollieren und weiter.
            await fetch(`/api/import/${id}/ueberspringen`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path, status: "fehler", message: `Datei konnte nicht übertragen werden (${e instanceof Error ? e.message : "unbekannt"}). Bei OneDrive: „Immer auf diesem Gerät behalten“.` }),
            }).catch(() => {});
            status = "fehler";
          }
          tally[status]++;
          finished++;
          setCounts({ ...tally });
          setDone(finished);
        }
      };
      await Promise.all(Array.from({ length: PARALLEL }, worker));
      await fetch(`/api/import/${id}/fertig`, { method: "POST" });
      router.push(`/archiv/import/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import fehlgeschlagen");
      setRunning(false);
    }
  }

  const total = plan.length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <section className="card flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" disabled={running} onClick={() => folderInput.current?.click()}>
          <FolderOpen className="size-4" aria-hidden="true" /> Ordner wählen
        </button>
        <button type="button" className="btn-secondary" disabled={running} onClick={() => filesInput.current?.click()}>
          <FileUp className="size-4" aria-hidden="true" /> Einzelne Dateien
        </button>
        <input
          ref={folderInput}
          type="file"
          className="hidden"
          {...{ webkitdirectory: "" }} // Ordnerauswahl (Chromium/Electron, Safari)
          multiple
          onChange={(e) => {
            choose(e.target.files, true);
            e.target.value = "";
          }}
        />
        <input
          ref={filesInput}
          type="file"
          className="hidden"
          multiple
          accept=".docx,.docm,.doc,.rtf,.txt,.md,.pptx,.pdf"
          onChange={(e) => {
            choose(e.target.files, false);
            e.target.value = "";
          }}
        />
      </div>

      {picked.length === 0 && (
        <p className="text-[15px] leading-relaxed text-ink-2">
          Unterstützt: Word (.docx, .docm, .doc), RTF, Text, PowerPoint (.pptx) und PDF. Unterordner werden mit eingelesen. Datum, Art, Ort, Bibelstelle und Titel werden – wo möglich – aus dem Dateinamen gelesen, z. B.{" "}
          <span className="font-mono text-sm">2023-08-23 Bibelstunde WHV (Markus 1,1ff.)_Epilog.docx</span>. Deine Dateien werden nicht verändert; DMS legt eine Kopie ab.
        </p>
      )}

      {picked.length > 0 && !running && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-lg font-semibold">{label}</p>
            <p className="text-ink-2">
              <strong>{toImport.length.toLocaleString("de-DE")}</strong> Dateien werden übernommen
              {byExt.length > 0 && <> ({byExt.map(([e, n]) => `${n} × .${e}`).join(", ")})</>}
              {toSkip.length > 0 && <>, {toSkip.length.toLocaleString("de-DE")} übersprungen</>}.
            </p>
          </div>
          {toSkip.length > 0 && (
            <details className="rounded-lg bg-surface-2 px-4 py-2 text-sm">
              <summary className="cursor-pointer py-1 text-ink-2">Warum übersprungen?</summary>
              <ul className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto pb-2">
                {toSkip.slice(0, 300).map((s) => (
                  <li key={s.path}>
                    <span className="font-mono text-xs">{s.path}</span> – {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <label className="flex items-start gap-3 text-[15px]">
            <input type="checkbox" checked={topics} onChange={(e) => setTopics(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" />
            <span>
              Unterordner als <strong>Themen</strong> übernehmen <span className="text-muted">(z. B. „Themen/Gebet“ → Thema „Gebet“; Sammelordner wie „Predigten“ zählen nicht)</span>
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-accent" disabled={!toImport.length} onClick={() => void start()}>
              {toImport.length.toLocaleString("de-DE")} Dateien importieren
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPicked([])}>
              Andere Auswahl
            </button>
          </div>
        </div>
      )}

      {running && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold">
              {done.toLocaleString("de-DE")} von {total.toLocaleString("de-DE")} ({percent} %)
            </p>
            <button type="button" className="btn-secondary min-h-10 px-3 text-sm" onClick={() => (cancelRef.current = true)} disabled={cancelRef.current}>
              <Square className="size-3.5" aria-hidden="true" /> Abbrechen
            </button>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          <p className="truncate font-mono text-xs text-muted">{current}</p>
          <p className="text-sm text-ink-2">
            {counts.importiert} importiert · {counts.doppelt} schon vorhanden · {counts.uebersprungen} übersprungen · {counts.fehler} Fehler
          </p>
          <p className="text-xs text-muted">Das Fenster bitte offen lassen. Bei OneDrive werden Dateien, die nur online liegen, dabei heruntergeladen.</p>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {error}
          {jobId && (
            <>
              {" "}
              <Link href={`/archiv/import/${jobId}`}>Bisheriges Ergebnis ansehen</Link>
            </>
          )}
        </p>
      )}
    </section>
  );
}
