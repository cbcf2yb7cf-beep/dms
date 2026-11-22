"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BookmarkPlus,
  Copy,
  History,
  PanelRightClose,
  PanelRightOpen,
  Printer,
  Star,
  Trash2,
} from "lucide-react";
import type { DocStatus, DocType } from "@/db/schema";
import { outline as getOutline, plainText, wordCount, type JSONNode } from "@/lib/content";
import { STATUS_OPTIONS, TYPE_LABELS, TYPE_OPTIONS } from "@/lib/doc-meta";
import { formatRef, parseRef } from "@/lib/bible/refs";
import { duplicate, toggleArchive, trashDocument } from "@/lib/actions/documents";
import { TagInput } from "@/components/tag-input";
import { extensions } from "./extensions";
import { Toolbar } from "./toolbar";

export type EditorDoc = {
  id: string;
  title: string;
  contentJson: string;
  type: DocType;
  status: DocStatus;
  heldOn: string | null;
  occasion: string;
  place: string;
  series: string;
  mainRef: string;
  summary: string;
  favorite: boolean;
  archived: boolean;
  topics: string[];
  tags: string[];
  refs: { label: string; source: "main" | "block" | "text" }[];
  updatedAt: number;
  files: { id: string; fileName: string; ext: string; sha256: string; size: number }[];
};

export type Facets = { topics: string[]; tags: string[]; series: string[]; occasions: string[]; places: string[] };

type Meta = Omit<EditorDoc, "id" | "contentJson" | "refs" | "updatedAt" | "archived" | "files">;
type SaveState = { kind: "saved"; at: number } | { kind: "dirty" } | { kind: "saving" } | { kind: "error"; message: string } | { kind: "conflict"; serverAt: number };

const AUTOSAVE_MS = 1500;
const timeFmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });

export function DocumentEditor({ doc, facets }: { doc: EditorDoc; facets: Facets }) {
  const [meta, setMeta] = useState<Meta>(() => ({
    title: doc.title,
    type: doc.type,
    status: doc.status,
    heldOn: doc.heldOn,
    occasion: doc.occasion,
    place: doc.place,
    series: doc.series,
    mainRef: doc.mainRef,
    summary: doc.summary,
    favorite: doc.favorite,
    topics: doc.topics,
    tags: doc.tags,
  }));
  const [refs, setRefs] = useState(doc.refs);
  const [state, setState] = useState<SaveState>({ kind: "saved", at: doc.updatedAt });
  const [metaOpen, setMetaOpen] = useState<boolean | null>(null); // null = Standard nach Bildschirmbreite

  const metaRef = useRef(meta);
  const baseRef = useRef(doc.updatedAt);
  const dirtyRef = useRef(false);
  const savingRef = useRef<Promise<boolean> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Immer die aktuelle save-Funktion (onUpdate des Editors hält sonst die vom ersten Render fest).
  const saveRef = useRef<(opts?: { manualVersion?: boolean; force?: boolean }) => Promise<boolean>>(async () => false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const forms = useRef<{ duplicate: HTMLFormElement | null; archive: HTMLFormElement | null; trash: HTMLFormElement | null }>({
    duplicate: null,
    archive: null,
    trash: null,
  });

  const editor = useEditor({
    extensions,
    content: JSON.parse(doc.contentJson) as JSONNode,
    immediatelyRender: false,
    editorProps: { attributes: { class: "manuscript min-h-[50vh] pb-24", "aria-label": "Manuskript" } },
    onUpdate: () => markDirty(),
  });

  const payload = useCallback(
    (manualVersion = false, force = false) =>
      JSON.stringify({
        baseUpdatedAt: force ? Number.MAX_SAFE_INTEGER : baseRef.current,
        manualVersion,
        input: { ...metaRef.current, content: editor?.getJSON() },
      }),
    [editor],
  );

  /** Speichert sofort. true = gespeichert. Läuft nie doppelt. */
  const save = useCallback(
    async (opts: { manualVersion?: boolean; force?: boolean } = {}): Promise<boolean> => {
      if (!editor) return false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savingRef.current) await savingRef.current;
      if (!dirtyRef.current && !opts.manualVersion && !opts.force) return true;

      const run = (async () => {
        dirtyRef.current = false;
        setState({ kind: "saving" });
        try {
          const res = await fetch(`/api/dokumente/${doc.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload(opts.manualVersion, opts.force),
          });
          const data = await res.json();
          if (res.status === 409) {
            dirtyRef.current = true;
            setState({ kind: "conflict", serverAt: data.updatedAt });
            return false;
          }
          if (!res.ok) throw new Error(data.error ?? `Fehler ${res.status}`);
          baseRef.current = data.updatedAt;
          setRefs(data.refs);
          // Während des Speicherns weitergeschrieben? Dann gleich noch einmal.
          setState(dirtyRef.current ? { kind: "dirty" } : { kind: "saved", at: data.updatedAt });
          return true;
        } catch (e) {
          dirtyRef.current = true;
          setState({ kind: "error", message: e instanceof Error ? e.message : "Speichern fehlgeschlagen" });
          return false;
        }
      })();
      savingRef.current = run;
      const ok = await run;
      savingRef.current = null;
      if (ok && dirtyRef.current) schedule();
      return ok;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, payload, doc.id],
  );

  saveRef.current = save;

  function schedule() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void saveRef.current(), AUTOSAVE_MS);
  }

  // Titel wächst mit (auch ohne CSS field-sizing, z. B. in älterem Safari).
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [meta.title]);

  function markDirty() {
    dirtyRef.current = true;
    setState((s) => (s.kind === "conflict" ? s : { kind: "dirty" }));
    schedule();
  }

  function updateMeta<K extends keyof Meta>(key: K, value: Meta[K]) {
    const next = { ...metaRef.current, [key]: value };
    metaRef.current = next;
    setMeta(next);
    markDirty();
  }

  // Beim Verlassen: ungespeicherte Änderungen per keepalive senden und ggf. warnen.
  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current || !editor) return;
      const body = payload();
      if (body.length < 60_000) {
        void fetch(`/api/dokumente/${doc.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
        dirtyRef.current = false;
      }
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      flush();
      if (dirtyRef.current) e.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [editor, payload, doc.id]);

  // ⌘S / Strg+S: sofort speichern und eine Version anlegen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save({ manualVersion: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const live = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return { outline: [], words: 0 };
      const json = e.getJSON() as JSONNode;
      return { outline: getOutline(json), words: wordCount(plainText(json)) };
    },
  }) ?? { outline: [], words: 0 };

  const jumpTo = (index: number) => {
    const el = editor?.view.dom.querySelectorAll("h2, h3, h4")[index];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Vor Aktionen wie Duplizieren erst speichern, dann das Formular absenden. */
  const submitAfterSave = async (form: HTMLFormElement | null) => {
    if (!form) return;
    if (await save()) form.requestSubmit();
  };

  const mainParsed = useMemo(() => (meta.mainRef.trim() ? parseRef(meta.mainRef) : undefined), [meta.mainRef]);
  const metaClass = metaOpen === null ? "hidden xl:flex" : metaOpen ? "flex" : "hidden";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Kopfzeile */}
      <header className="z-20 flex md:sticky md:top-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-bg/95 px-4 py-2.5 backdrop-blur sm:px-6 print:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/archiv" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-muted hover:bg-surface-2 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" /> Archiv
          </Link>
          <span className="truncate text-sm text-muted">{TYPE_LABELS[meta.type]}{meta.series ? ` · ${meta.series}` : ""}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <SaveIndicator state={state} words={live.words} onRetry={() => void save()} />
          <IconButton label={meta.favorite ? "Aus Favoriten entfernen" : "Als Favorit markieren"} onClick={() => updateMeta("favorite", !meta.favorite)} active={meta.favorite}>
            <Star className={`size-5 ${meta.favorite ? "fill-accent text-accent" : ""}`} aria-hidden="true" />
          </IconButton>
          <IconButton label="Version sichern (⌘S)" onClick={() => void save({ manualVersion: true })}>
            <BookmarkPlus className="size-5" aria-hidden="true" />
          </IconButton>
          <Link href={`/archiv/${doc.id}/versionen`} className="inline-flex size-11 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label="Versionen" title="Versionen">
            <History className="size-5" aria-hidden="true" />
          </Link>
          <IconButton label="Drucken" onClick={() => void save().then(() => window.print())}>
            <Printer className="size-5" aria-hidden="true" />
          </IconButton>
          <form action={duplicate} ref={(f) => void (forms.current.duplicate = f)}>
            <input type="hidden" name="id" value={doc.id} />
            <IconButton label="Duplizieren" onClick={() => void submitAfterSave(forms.current.duplicate)}>
              <Copy className="size-5" aria-hidden="true" />
            </IconButton>
          </form>
          <form action={toggleArchive} ref={(f) => void (forms.current.archive = f)}>
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="archived" value={doc.archived ? "0" : "1"} />
            <IconButton label={doc.archived ? "Aus dem Archiv holen" : "Archivieren"} onClick={() => void submitAfterSave(forms.current.archive)}>
              {doc.archived ? <ArchiveRestore className="size-5" aria-hidden="true" /> : <Archive className="size-5" aria-hidden="true" />}
            </IconButton>
          </form>
          <form action={trashDocument} ref={(f) => void (forms.current.trash = f)}>
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="redirect" value="1" />
            <IconButton
              label="In den Papierkorb"
              onClick={() => {
                if (window.confirm("Dokument in den Papierkorb legen? Es bleibt dort 30 Tage wiederherstellbar.")) void submitAfterSave(forms.current.trash);
              }}
            >
              <Trash2 className="size-5" aria-hidden="true" />
            </IconButton>
          </form>
          <IconButton label="Details ein-/ausblenden" onClick={() => setMetaOpen((o) => (o === null ? window.innerWidth < 1280 : !o))}>
            {metaOpen ? <PanelRightClose className="size-5" aria-hidden="true" /> : <PanelRightOpen className="size-5" aria-hidden="true" />}
          </IconButton>
        </div>
      </header>

      {state.kind === "conflict" && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-danger-soft px-6 py-3 text-sm text-danger print:hidden" role="alert">
          <span className="flex-1">Dieses Dokument wurde inzwischen in einem anderen Fenster oder auf einem anderen Gerät gespeichert ({timeFmt.format(state.serverAt)} Uhr). Deine Änderungen hier sind noch nicht gespeichert.</span>
          <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>Andere Fassung laden</button>
          <button type="button" className="btn-danger" onClick={() => void save({ force: true, manualVersion: true })}>Diese Fassung speichern</button>
        </div>
      )}

      <div className="flex flex-1 flex-wrap">
        {/* Gliederung + Bibelstellen */}
        <nav aria-label="Gliederung" className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border px-5 py-8 lg:flex print:hidden">
          <div className="sticky top-24 flex max-h-[calc(100dvh-8rem)] flex-col gap-6 overflow-y-auto">
            <section className="flex flex-col gap-1">
              <h2 className="eyebrow mb-2">Gliederung</h2>
              {live.outline.length === 0 && <p className="text-sm text-muted">Überschriften erscheinen hier.</p>}
              {live.outline.map((item) => (
                <button
                  key={item.index}
                  type="button"
                  onClick={() => jumpTo(item.index)}
                  className={`min-h-9 rounded-md px-2 py-1.5 text-left text-sm leading-snug hover:bg-surface-2 ${item.level === 2 ? "font-medium text-ink" : "pl-5 text-ink-2"}`}
                >
                  {item.text || <span className="text-muted italic">Ohne Text</span>}
                </button>
              ))}
            </section>
            <section className="flex flex-col gap-1">
              <h2 className="eyebrow mb-2">Bibelstellen</h2>
              {refs.length === 0 && <p className="text-sm text-muted">Stellen wie „Röm 8,28“ werden beim Speichern erkannt.</p>}
              {refs.map((r) => (
                <Link key={r.label} href={`/archiv?stelle=${encodeURIComponent(r.label)}`} className="flex min-h-9 items-center justify-between gap-2 rounded-md px-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink" title="Weitere Dokumente zu dieser Stelle">
                  <span>{r.label}</span>
                  {r.source === "main" && <span className="text-xs text-accent">Haupttext</span>}
                </Link>
              ))}
            </section>
          </div>
        </nav>

        {/* Manuskript */}
        <main className="min-w-0 flex-[999_1_480px] px-5 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto flex max-w-[720px] flex-col gap-5">
            <div className="z-10 -mx-2 md:sticky md:top-16 bg-bg/95 px-2 py-1 backdrop-blur print:hidden">{editor && <Toolbar editor={editor} />}</div>
            <label htmlFor="doc-title" className="sr-only">Titel</label>
            <textarea
              id="doc-title"
              ref={titleRef}
              value={meta.title}
              rows={1}
              placeholder="Titel"
              onChange={(e) => updateMeta("title", e.target.value.replace(/\n/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  editor?.commands.focus("start");
                }
              }}
              className="resize-none overflow-hidden bg-transparent font-serif text-4xl leading-tight font-semibold tracking-tight outline-none placeholder:text-muted sm:text-[44px]"
            />
            {(meta.mainRef || meta.heldOn) && (
              <p className="-mt-2 text-[15px] text-muted">
                {[mainParsed ? formatRef(mainParsed, "name") : meta.mainRef, meta.heldOn && new Date(`${meta.heldOn}T12:00:00`).toLocaleDateString("de-DE", { dateStyle: "long" }), meta.place]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <EditorContent editor={editor} />
          </div>
        </main>

        {/* Details */}
        <aside aria-label="Details" className={`${metaClass} w-full shrink-0 flex-col gap-5 border-l border-border bg-surface/50 px-5 py-8 xl:w-80 print:hidden`}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="m-type" className="label">Art</label>
              <select id="m-type" value={meta.type} onChange={(e) => updateMeta("type", e.target.value as DocType)} className="input">
                {TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="m-status" className="label">Status</label>
              <select id="m-status" value={meta.status} onChange={(e) => updateMeta("status", e.target.value as DocStatus)} className="input">
                {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="m-main" className="label">Haupttext</label>
            <input id="m-main" value={meta.mainRef} onChange={(e) => updateMeta("mainRef", e.target.value)} placeholder="z. B. Hebr 11,1-6" className="input" />
            {meta.mainRef.trim() && (
              <p className={`mt-1 text-xs ${mainParsed ? "text-muted" : "text-danger"}`}>{mainParsed ? `Erkannt: ${formatRef(mainParsed, "name")}` : "Stelle nicht erkannt"}</p>
            )}
          </div>
          <div>
            <label htmlFor="m-held" className="label">Gehalten am</label>
            <input id="m-held" type="date" value={meta.heldOn ?? ""} onChange={(e) => updateMeta("heldOn", e.target.value || null)} className="input" />
          </div>
          <Field id="m-occasion" label="Anlass" value={meta.occasion} list={facets.occasions} placeholder="z. B. Gottesdienst, Erntedank" onChange={(v) => updateMeta("occasion", v)} />
          <Field id="m-place" label="Ort / Gemeinde" value={meta.place} list={facets.places} onChange={(v) => updateMeta("place", v)} />
          <Field id="m-series" label="Reihe" value={meta.series} list={facets.series} placeholder="z. B. Hebräerbrief" onChange={(v) => updateMeta("series", v)} />
          <TagInput label="Themen" values={meta.topics} suggestions={facets.topics} placeholder="z. B. Glaube, Gnade" onChange={(v) => updateMeta("topics", v)} />
          <TagInput label="Schlagwörter" values={meta.tags} suggestions={facets.tags} onChange={(v) => updateMeta("tags", v)} />
          <div>
            <label htmlFor="m-summary" className="label">Kurzbeschreibung</label>
            <textarea id="m-summary" value={meta.summary} onChange={(e) => updateMeta("summary", e.target.value)} rows={4} className="input py-2" />
          </div>
          {doc.files.length > 0 && <OriginalFiles files={doc.files} />}
        </aside>
      </div>
    </div>
  );
}

function Field({ id, label, value, list, placeholder, onChange }: { id: string; label: string; value: string; list: string[]; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} list={`${id}-list`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="input" />
      <datalist id={`${id}-list`}>
        {list.map((v) => <option key={v} value={v} />)}
      </datalist>
    </div>
  );
}

function IconButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={active} className="inline-flex size-11 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink">
      {children}
    </button>
  );
}

function SaveIndicator({ state, words, onRetry }: { state: SaveState; words: number; onRetry: () => void }) {
  const wordsText = `${words.toLocaleString("de-DE")} Wörter`;
  let text: React.ReactNode;
  if (state.kind === "saved") text = `Gespeichert ${timeFmt.format(state.at)}`;
  else if (state.kind === "saving") text = "Speichert …";
  else if (state.kind === "dirty") text = "Ungespeichert";
  else if (state.kind === "conflict") text = <span className="text-danger">Konflikt</span>;
  else
    text = (
      <button type="button" onClick={onRetry} className="text-danger underline" title={state.message}>
        Nicht gespeichert – erneut versuchen
      </button>
    );
  return (
    <span className="mr-2 hidden text-sm text-muted sm:inline" aria-live="polite">
      {text} · {wordsText}
    </span>
  );
}

type DesktopBridge = { openOriginal: (f: { sha256: string; ext: string; fileName: string }) => Promise<string> };

/** Importierte Originaldatei(en): in der Mac-App direkt öffnen, sonst herunterladen. */
function OriginalFiles({ files }: { files: EditorDoc["files"] }) {
  const [message, setMessage] = useState<string | null>(null);
  // Erst nach dem Laden prüfen, ob wir in der Mac-App laufen (sonst unterscheiden sich Server- und Browser-HTML).
  const [bridge, setBridge] = useState<DesktopBridge | undefined>(undefined);
  useEffect(() => setBridge((window as unknown as { dmsDesktop?: DesktopBridge }).dmsDesktop), []);
  return (
    <div className="flex flex-col gap-2">
      <span className="label mb-0">Originaldatei</span>
      {files.map((f) => (
        <div key={f.id} className="flex flex-col gap-1 rounded-lg border border-border bg-bg px-3 py-2">
          <span className="text-sm break-all">{f.fileName}</span>
          <span className="flex flex-wrap gap-3 text-sm">
            {bridge && (
              <button
                type="button"
                className="text-accent underline"
                onClick={async () => {
                  const err = await bridge.openOriginal({ sha256: f.sha256, ext: f.ext, fileName: f.fileName });
                  setMessage(err || null);
                }}
              >
                Öffnen
              </button>
            )}
            <a href={`/api/original/${f.id}`}>Herunterladen</a>
            <span className="text-muted">{(f.size / 1024).toLocaleString("de-DE", { maximumFractionDigits: 0 })} KB</span>
          </span>
        </div>
      ))}
      {message && <p className="text-xs text-danger">{message}</p>}
      <p className="text-xs text-muted">Unverändert gespeichert. Änderungen in Word wirken sich nicht auf DMS aus.</p>
    </div>
  );
}
