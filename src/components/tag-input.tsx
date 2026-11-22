"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";

/** Chips-Eingabe: Enter oder Komma fügt hinzu, Rücktaste entfernt den letzten Eintrag. */
export function TagInput({
  label,
  values,
  onChange,
  suggestions,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const value = raw.trim().replace(/,$/, "").trim();
    if (!value) return;
    if (!values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      // Vorhandene Schreibweise übernehmen ("gnade" → "Gnade").
      const known = suggestions.find((s) => s.toLowerCase() === value.toLowerCase());
      onChange([...values, known ?? value]);
    }
    setDraft("");
  };

  const open = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-border-strong bg-bg px-2 py-1.5 focus-within:border-accent">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-0.5 pr-1 pl-2.5 text-sm">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="inline-flex size-6 items-center justify-center rounded-full text-muted hover:bg-border hover:text-ink" aria-label={`${v} entfernen`}>
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          list={`${id}-list`}
          value={draft}
          placeholder={values.length ? "" : placeholder}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          className="min-h-8 min-w-24 flex-1 bg-transparent px-1 text-[15px] outline-none placeholder:text-muted"
        />
        <datalist id={`${id}-list`}>
          {open.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
