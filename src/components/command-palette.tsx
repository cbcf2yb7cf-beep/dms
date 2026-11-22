"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { NAV, SETTINGS_NAV } from "@/lib/nav";
import { NavIcon } from "./nav-icon";

const EVENT = "dms:open-search";
export const openSearch = () => window.dispatchEvent(new Event(EVENT));

const ENTRIES = [...NAV, SETTINGS_NAV];

/**
 * Globale Suche (⌘K / Strg+K). In Phase 1 springt sie zu Bereichen; ab Phase 2/5
 * kommen Dokumente, Bibelstellen und Themen als Treffer dazu.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ENTRIES;
    return ENTRIES.filter((e) => `${e.label} ${e.keywords}`.toLowerCase().includes(q));
  }, [query]);

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

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
                setIndex((i) => Math.min(i + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter" && results[index]) go(results[index].href);
            }}
            placeholder="Wohin? Bereich suchen …"
            className="min-h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={results[index] ? `cmdk-${index}` : undefined}
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-xs text-muted">Esc</kbd>
        </div>
        <ul id="cmdk-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Kein Bereich gefunden. Dokumente werden ab Phase 2 durchsucht.</li>}
          {results.map((entry, i) => (
            <li key={entry.href} id={`cmdk-${i}`} role="option" aria-selected={i === index}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(entry.href)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left ${i === index ? "bg-accent-soft" : ""}`}
              >
                <NavIcon name={entry.icon} className="size-5 text-muted" />
                <span className="flex-1">{entry.label}</span>
                {i === index && <CornerDownLeft className="size-4 text-muted" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted">Bald hier: Predigten, Bibelstellen und Themen durchsuchen.</p>
      </div>
    </div>
  );
}
