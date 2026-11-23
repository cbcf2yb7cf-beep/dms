"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Doc = { id: string; title: string };

/** Dokument über die Suche auswählen (Titel, Reihe, Bibelstelle, Volltext). */
export function DocPicker({ name, label, initial }: { name: string; label: string; initial?: Doc | null }) {
  const [doc, setDoc] = useState<Doc | null>(initial ?? null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Doc[]>([]);

  useEffect(() => {
    const t = q.trim();
    if (!t) return setHits([]);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/suche?q=${encodeURIComponent(t)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { docs: { id: string; title: string }[] }) => setHits(d.docs.map((x) => ({ id: x.id, title: x.title || "Ohne Titel" }))))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="label mb-0">{label}</span>
      <input type="hidden" name={name} value={doc?.id ?? ""} />
      {doc ? (
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border-strong bg-surface px-3">
          <span className="truncate font-medium">{doc.title}</span>
          <button type="button" onClick={() => setDoc(null)} className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2" aria-label="Auswahl entfernen">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titel, Bibelstelle oder Stichwort …" className="input" aria-label={`${label} suchen`} />
          {hits.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-xl">
              {hits.map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => { setDoc(h); setQ(""); }} className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-surface-2">{h.title}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
