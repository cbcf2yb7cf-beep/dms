"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CornerDownLeft, FileText, Search, TextSearch } from "lucide-react";
import { NAV, SETTINGS_NAV } from "@/lib/nav";
import { TYPE_LABELS } from "@/lib/doc-meta";
import type { DocType } from "@/db/schema";
import { NavIcon } from "./nav-icon";

const EVENT = "dms:open-search";
export const openSearch = () => window.dispatchEvent(new Event(EVENT));

const AREAS = [...NAV, SETTINGS_NAV];

type DocHit = { id: string; title: string; type: DocType; mainRef: string };
type Entry = { key: string; href: string; label: string; hint?: string; icon: React.ReactNode };

/** Globale Suche (⌘K / Strg+K): Dokumente, Bibelstellen, Volltext im Archiv, Bereiche. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [hits, setHits] = useState<{ q: string; docs: DocHit[]; stelle: string | null }>({ q: "", docs: [], stelle: null });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Dokumente suchen (leicht verzögert, nur die letzte Antwort zählt).
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/suche?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { docs: [], stelle: null }))
        .then((data) => setHits({ q, docs: data.docs, stelle: data.stelle }))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim();
    const lower = q.toLowerCase();
    const areas = AREAS.filter((e) => !q || `${e.label} ${e.keywords}`.toLowerCase().includes(lower)).map((e) => ({
      key: e.href,
      href: e.href,
      label: e.label,
      hint: "Bereich",
      icon: <NavIcon name={e.icon} className="size-5 text-muted" />,
    }));
    if (!q) return areas;
    const current = hits.q === q ? hits : { docs: [], stelle: null };
    const list: Entry[] = [];
    if (current.stelle) {
      list.push({
        key: "bibel",
        href: `/bibel?stelle=${encodeURIComponent(current.stelle)}`,
        label: `${current.stelle} in der Bibel aufschlagen`,
        hint: "Bibel",
        icon: <BookOpen className="size-5 text-accent" aria-hidden="true" />,
      });
      list.push({
        key: "stelle",
        href: `/archiv?stelle=${encodeURIComponent(current.stelle)}`,
        label: `Dokumente zu ${current.stelle}`,
        hint: "Archiv",
        icon: <FileText className="size-5 text-accent" aria-hidden="true" />,
      });
    }
    for (const d of current.docs) {
      list.push({
        key: d.id,
        href: `/archiv/${d.id}`,
        label: d.title || "Ohne Titel",
        hint: [TYPE_LABELS[d.type], d.mainRef].filter(Boolean).join(" · "),
        icon: <FileText className="size-5 text-muted" aria-hidden="true" />,
      });
    }
    if (!current.stelle) {
      list.push({
        key: "konkordanz",
        href: `/bibel/suche?q=${encodeURIComponent(q)}`,
        label: `„${q}“ in der Bibel suchen`,
        hint: "Konkordanz",
        icon: <BookOpen className="size-5 text-muted" aria-hidden="true" />,
      });
    }
    list.push({
      key: "volltext",
      href: `/archiv?q=${encodeURIComponent(q)}`,
      label: `„${q}“ im Text aller Dokumente suchen`,
      hint: "Volltext",
      icon: <TextSearch className="size-5 text-muted" aria-hidden="true" />,
    });
    return [...list, ...areas];
  }, [query, hits]);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const active = Math.min(index, entries.length - 1);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Suche">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Suche schließen" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-5 shrink-0 text-muted" aria-hidden="true" />
          <label htmlFor="cmdk" className="sr-only">Suchbegriff</label>
          <input
            ref={inputRef}
            id="cmdk"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, entries.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter" && entries[active]) go(entries[active].href);
            }}
            placeholder="Titel, Bibelstelle oder Bereich …"
            className="min-h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={entries[active] ? `cmdk-${active}` : undefined}
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-xs text-muted">Esc</kbd>
        </div>
        <ul id="cmdk-list" role="listbox" className="max-h-96 overflow-y-auto p-2">
          {entries.map((entry, i) => (
            <li key={entry.key} id={`cmdk-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(entry.href)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left ${i === active ? "bg-accent-soft" : ""}`}
              >
                {entry.icon}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{entry.label}</span>
                  {entry.hint && <span className="truncate text-xs text-muted">{entry.hint}</span>}
                </span>
                {i === active && <CornerDownLeft className="size-4 shrink-0 text-muted" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
