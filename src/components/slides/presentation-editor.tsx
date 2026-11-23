"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Download, FileText, MonitorPlay, Plus, Presentation, Printer, Trash2, Tv } from "lucide-react";
import { emptySlide, KIND_LABELS, SLIDE_KINDS, THEME_IDS, THEMES, newSlideId, type Slide, type SlideKind, type ThemeId } from "@/lib/slides/types";
import { formatRef, parseRef } from "@/lib/bible/refs";
import { SlideView } from "./slide-view";

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";
type Bridge = { presentOnDisplay?: (path: string) => Promise<string> };
const AUTOSAVE_MS = 1200;

export function PresentationEditor({ initial }: { initial: { id: string; title: string; theme: ThemeId; slides: Slide[]; updatedAt: number; document: { id: string; title: string } | null } }) {
  const [title, setTitle] = useState(initial.title);
  const [theme, setTheme] = useState<ThemeId>(initial.theme);
  const [slides, setSlides] = useState<Slide[]>(initial.slides.length ? initial.slides : [emptySlide("titel")]);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<SaveState>("saved");
  const [bridge, setBridge] = useState<Bridge | undefined>();

  const base = useRef(initial.updatedAt);
  const latest = useRef({ title, theme, slides });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef<Promise<boolean> | null>(null);
  const dirty = useRef(false);

  useEffect(() => setBridge((window as unknown as { dmsDesktop?: Bridge }).dmsDesktop), []);

  const save = useCallback(async (force = false): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    if (saving.current) await saving.current;
    if (!dirty.current && !force) return true;
    const run = (async () => {
      dirty.current = false;
      setState("saving");
      try {
        const res = await fetch(`/api/praesentationen/${initial.id}${force ? "?force=1" : ""}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseUpdatedAt: base.current, ...latest.current }),
        });
        const data = await res.json();
        if (res.status === 409) {
          dirty.current = true;
          setState("conflict");
          return false;
        }
        if (!res.ok) throw new Error(data.error);
        base.current = data.updatedAt;
        setState(dirty.current ? "dirty" : "saved");
        return true;
      } catch {
        dirty.current = true;
        setState("error");
        return false;
      }
    })();
    saving.current = run;
    const ok = await run;
    saving.current = null;
    return ok;
  }, [initial.id]);

  const saveRef = useRef(save);
  saveRef.current = save;

  function change(next: Partial<{ title: string; theme: ThemeId; slides: Slide[] }>) {
    latest.current = { ...latest.current, ...next };
    if (next.title !== undefined) setTitle(next.title);
    if (next.theme !== undefined) setTheme(next.theme);
    if (next.slides !== undefined) setSlides(next.slides);
    dirty.current = true;
    setState((s) => (s === "conflict" ? s : "dirty"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveRef.current(), AUTOSAVE_MS);
  }

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirty.current) {
        const body = JSON.stringify({ baseUpdatedAt: base.current, ...latest.current });
        if (body.length < 60_000) {
          void fetch(`/api/praesentationen/${initial.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
          dirty.current = false;
        }
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [initial.id]);

  const current = slides[Math.min(index, slides.length - 1)];
  const updateSlide = (patch: Partial<Slide>) => change({ slides: slides.map((s, i) => (i === index ? ({ ...s, ...patch } as Slide) : s)) });
  const insert = (kind: SlideKind) => {
    const next = [...slides];
    next.splice(index + 1, 0, emptySlide(kind));
    change({ slides: next });
    setIndex(index + 1);
  };
  const move = (dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[index], next[j]] = [next[j], next[index]];
    change({ slides: next });
    setIndex(j);
  };
  const duplicateSlide = () => {
    const next = [...slides];
    next.splice(index + 1, 0, { ...current, id: newSlideId() });
    change({ slides: next });
    setIndex(index + 1);
  };
  const remove = () => {
    if (slides.length === 1) return change({ slides: [emptySlide("titel")] });
    change({ slides: slides.filter((_, i) => i !== index) });
    setIndex(Math.max(0, index - 1));
  };

  async function present(where: "fenster" | "beamer" | "referent") {
    await save();
    const folie = `?folie=${index + 1}`;
    if (where === "referent") window.open(`/referent/${initial.id}${folie}`, "dms-referent");
    else if (where === "beamer" && bridge?.presentOnDisplay) await bridge.presentOnDisplay(`/vortrag/${initial.id}${folie}`);
    else window.open(`/vortrag/${initial.id}${folie}`, "dms-vortrag");
  }

  const status = { saved: "Gespeichert", dirty: "Ungespeichert", saving: "Speichert …", error: "Nicht gespeichert", conflict: "Konflikt" }[state];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link href="/praesentationen" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-muted hover:bg-surface-2 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" /> Präsentationen
          </Link>
          <label htmlFor="p-title" className="sr-only">Titel</label>
          <input id="p-title" value={title} onChange={(e) => change({ title: e.target.value })} placeholder="Titel der Präsentation" className="min-h-11 min-w-0 flex-1 rounded-lg bg-transparent px-2 font-serif text-xl font-semibold outline-none focus:bg-surface" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm ${state === "error" || state === "conflict" ? "text-danger" : "text-muted"}`} aria-live="polite">{status}</span>
          <label htmlFor="p-theme" className="sr-only">Design</label>
          <select id="p-theme" value={theme} onChange={(e) => change({ theme: e.target.value as ThemeId })} className="input min-h-10 w-auto text-sm">
            {THEME_IDS.map((t) => <option key={t} value={t}>{THEMES[t].name}</option>)}
          </select>
          <a href={`/api/praesentationen/${initial.id}/pptx`} onClick={() => void save()} className="btn-secondary min-h-10 px-3 text-sm" title="Als PowerPoint herunterladen">
            <Download className="size-4" aria-hidden="true" /> PPTX
          </a>
          <button type="button" onClick={() => void save().then(() => window.open(`/drucken/${initial.id}`, "dms-druck"))} className="btn-secondary min-h-10 px-3 text-sm" title="Drucken oder als PDF sichern">
            <Printer className="size-4" aria-hidden="true" /> PDF
          </button>
          <button type="button" onClick={() => void present("referent")} className="btn-secondary min-h-10 px-3 text-sm" title="Referentenansicht mit Notizen und nächster Folie">
            <MonitorPlay className="size-4" aria-hidden="true" /> Referent
          </button>
          {bridge?.presentOnDisplay && (
            <button type="button" onClick={() => void present("beamer")} className="btn-secondary min-h-10 px-3 text-sm" title="Vollbild auf dem zweiten Bildschirm (Beamer)">
              <Tv className="size-4" aria-hidden="true" /> Beamer
            </button>
          )}
          <button type="button" onClick={() => void present("fenster")} className="btn-accent min-h-10 px-3 text-sm">
            <Presentation className="size-4" aria-hidden="true" /> Präsentieren
          </button>
        </div>
      </header>

      {state === "conflict" && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-danger-soft px-6 py-3 text-sm text-danger" role="alert">
          <span className="flex-1">Diese Präsentation wurde inzwischen in einem anderen Fenster gespeichert.</span>
          <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>Andere Fassung laden</button>
          <button type="button" className="btn-danger" onClick={() => void save(true)}>Diese Fassung speichern</button>
        </div>
      )}

      <div className="flex flex-1 flex-wrap">
        {/* Folienleiste */}
        <nav aria-label="Folien" className="flex w-full shrink-0 flex-col gap-2 border-r border-border p-3 lg:w-56">
          <ol className="flex gap-2 overflow-x-auto pb-1 lg:max-h-[calc(100dvh-9rem)] lg:flex-col lg:overflow-y-auto">
            {slides.map((s, i) => (
              <li key={s.id} className="shrink-0">
                <button type="button" onClick={() => setIndex(i)} aria-current={i === index} className={`flex w-40 items-start gap-1.5 rounded-lg p-1 text-left lg:w-full ${i === index ? "bg-accent-soft ring-2 ring-accent" : "hover:bg-surface-2"}`}>
                  <span className="w-4 pt-0.5 text-right text-xs text-muted">{i + 1}</span>
                  <span className="flex-1 overflow-hidden rounded border border-border">
                    <SlideView slide={s} theme={theme} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <details className="relative">
            <summary className="btn-secondary min-h-10 w-full cursor-pointer list-none px-3 text-sm [&::-webkit-details-marker]:hidden">
              <Plus className="size-4" aria-hidden="true" /> Folie hinzufügen
            </summary>
            <div className="absolute bottom-full left-0 z-20 mb-2 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-xl lg:bottom-auto lg:top-full lg:mt-2 lg:mb-0">
              {SLIDE_KINDS.map((k) => (
                <button key={k} type="button" className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-surface-2" onClick={(e) => { insert(k); (e.currentTarget.closest("details") as HTMLDetailsElement).open = false; }}>
                  {KIND_LABELS[k]}
                </button>
              ))}
            </div>
          </details>
        </nav>

        {/* Vorschau + Bearbeiten */}
        <main className="min-w-0 flex-[999_1_520px] p-5 sm:p-8">
          <div className="mx-auto flex max-w-4xl flex-col gap-5">
            <div className="overflow-hidden rounded-xl border border-border shadow-sm">
              <SlideView slide={current} theme={theme} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted">Folie {index + 1} von {slides.length} · {KIND_LABELS[current.kind]}</span>
              <div className="flex gap-1">
                <IconBtn label="Nach oben" onClick={() => move(-1)} disabled={index === 0}><ArrowUp className="size-4" aria-hidden="true" /></IconBtn>
                <IconBtn label="Nach unten" onClick={() => move(1)} disabled={index === slides.length - 1}><ArrowDown className="size-4" aria-hidden="true" /></IconBtn>
                <IconBtn label="Duplizieren" onClick={duplicateSlide}><Copy className="size-4" aria-hidden="true" /></IconBtn>
                <IconBtn label="Löschen" onClick={remove}><Trash2 className="size-4" aria-hidden="true" /></IconBtn>
              </div>
            </div>
            <SlideFields key={current.id} slide={current} onChange={updateSlide} />
            <div>
              <label htmlFor="s-notes" className="label">Sprechernotizen (nur in der Referentenansicht sichtbar)</label>
              <textarea id="s-notes" value={current.notes} onChange={(e) => updateSlide({ notes: e.target.value })} rows={4} className="input py-2" />
            </div>
            {initial.document && (
              <p className="text-sm text-muted">
                Erstellt aus <Link href={`/archiv/${initial.document.id}`}><FileText className="mr-1 inline size-3.5" aria-hidden="true" />{initial.document.title || "Ohne Titel"}</Link>
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="inline-flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-40">
      {children}
    </button>
  );
}

function SlideFields({ slide, onChange }: { slide: Slide; onChange: (patch: Partial<Slide>) => void }) {
  switch (slide.kind) {
    case "titel":
      return (
        <div className="grid gap-3">
          <Field label="Titel" value={slide.title} onChange={(v) => onChange({ title: v })} />
          <Field label="Untertitel" value={slide.subtitle} onChange={(v) => onChange({ subtitle: v })} />
        </div>
      );
    case "abschnitt":
      return <Field label="Überschrift" value={slide.title} onChange={(v) => onChange({ title: v })} />;
    case "punkte":
      return (
        <div className="grid gap-3">
          <Field label="Überschrift" value={slide.title} onChange={(v) => onChange({ title: v })} />
          <fieldset className="flex flex-col gap-2">
            <legend className="label">Punkte</legend>
            {slide.points.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input aria-label={`Punkt ${i + 1}`} value={p} onChange={(e) => onChange({ points: slide.points.map((x, j) => (j === i ? e.target.value : x)) })} className="input" />
                <IconBtn label="Punkt entfernen" onClick={() => onChange({ points: slide.points.filter((_, j) => j !== i) })}><Trash2 className="size-4" aria-hidden="true" /></IconBtn>
              </div>
            ))}
            {slide.points.length < 12 && (
              <button type="button" className="btn-secondary min-h-10 w-fit px-3 text-sm" onClick={() => onChange({ points: [...slide.points, ""] })}>
                <Plus className="size-4" aria-hidden="true" /> Punkt
              </button>
            )}
          </fieldset>
        </div>
      );
    case "bibel":
      return <BibleFields slide={slide} onChange={onChange} />;
    case "zitat":
      return (
        <div className="grid gap-3">
          <Area label="Zitat" value={slide.text} onChange={(v) => onChange({ text: v })} />
          <Field label="Quelle" value={slide.source} onChange={(v) => onChange({ source: v })} />
        </div>
      );
    case "bild":
      return <ImageFields slide={slide} onChange={onChange} />;
    case "leer":
      return <p className="text-sm text-muted">Schwarze Folie – z. B. zum Pausieren während der Predigt.</p>;
  }
}

function BibleFields({ slide, onChange }: { slide: Extract<Slide, { kind: "bibel" }>; onChange: (p: Partial<Slide>) => void }) {
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
  const [trId, setTrId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const parsed = slide.reference.trim() ? parseRef(slide.reference) : undefined;

  useEffect(() => {
    fetch("/api/bibel/uebersetzungen")
      .then((r) => (r.ok ? r.json() : { translations: [] }))
      .then((d: { translations: { id: string; name: string }[] }) => {
        setOptions(d.translations);
        setTrId((d.translations.find((t) => t.name === slide.translation) ?? d.translations[0])?.id ?? "");
      })
      .catch(() => {});
  }, [slide.translation]);

  async function load() {
    if (!parsed || !trId) return;
    setMsg(null);
    const r = await fetch(`/api/bibel/text?ref=${encodeURIComponent(formatRef(parsed))}&tr=${trId}`);
    const d = await r.json();
    if (!r.ok) return setMsg(d.error ?? "Nicht gefunden");
    onChange({ text: d.text, reference: d.label, translation: d.translation });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          <label htmlFor="b-ref" className="label">Bibelstelle</label>
          <input id="b-ref" value={slide.reference} onChange={(e) => onChange({ reference: e.target.value })} placeholder="z. B. Joh 3,16" className="input" />
        </div>
        {options.length > 0 && (
          <div className="min-w-40 flex-1">
            <label htmlFor="b-tr" className="label">Übersetzung</label>
            <select id="b-tr" value={trId} onChange={(e) => setTrId(e.target.value)} className="input">
              {options.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        <button type="button" className="btn-secondary" onClick={() => void load()} disabled={!parsed || !trId}>Text holen</button>
      </div>
      {msg && <p className="text-sm text-danger" role="alert">{msg}</p>}
      <Area label="Verstext" value={slide.text} onChange={(v) => onChange({ text: v })} rows={5} />
    </div>
  );
}

function ImageFields({ slide, onChange }: { slide: Extract<Slide, { kind: "bild" }>; onChange: (p: Partial<Slide>) => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      <div>
        <label htmlFor="img" className="label">Bild (PNG, JPEG, WebP, GIF – bis 20 MB)</label>
        <input
          id="img"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="text-sm"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setMsg("Lädt hoch …");
            const r = await fetch("/api/medien", { method: "POST", body: file });
            const d = await r.json();
            if (!r.ok) return setMsg(d.error ?? "Fehler");
            setMsg(null);
            onChange({ image: d.name });
          }}
        />
        {msg && <p className="mt-1 text-sm text-muted">{msg}</p>}
      </div>
      <Field label="Bildunterschrift" value={slide.caption} onChange={(v) => onChange({ caption: v })} />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = `f-${label.replace(/\W/g, "")}`;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input" />
    </div>
  );
}

function Area({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  const id = `a-${label.replace(/\W/g, "")}`;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="input py-2" />
    </div>
  );
}
