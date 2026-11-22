"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  BookOpen,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Minus,
  NotebookPen,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import { formatRef, parseRef } from "@/lib/bible/refs";

export const TRANSLATIONS = ["Luther 1912", "Elberfelder 1905", "Schlachter 1951", "King James Version", "World English Bible", "Berean Standard Bible"];

function Btn({ label, active, onClick, disabled, children }: { label: string; active?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // Auswahl im Editor nicht verlieren
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex size-10 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${active ? "bg-accent-soft text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />;
const icon = "size-[18px]";

export function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      highlight: e.isActive("highlight"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      note: e.isActive("note"),
      bible: e.isActive("bibleBlock"),
      bibleAttrs: e.getAttributes("bibleBlock") as { reference?: string; translation?: string },
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const [bibleOpen, setBibleOpen] = useState(false);
  const c = () => editor.chain().focus();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Formatierung">
        <Btn label="Überschrift" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 className={icon} aria-hidden="true" /></Btn>
        <Btn label="Unterüberschrift" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 className={icon} aria-hidden="true" /></Btn>
        <Sep />
        <Btn label="Fett (⌘B)" active={s.bold} onClick={() => c().toggleBold().run()}><Bold className={icon} aria-hidden="true" /></Btn>
        <Btn label="Kursiv (⌘I)" active={s.italic} onClick={() => c().toggleItalic().run()}><Italic className={icon} aria-hidden="true" /></Btn>
        <Btn label="Unterstrichen (⌘U)" active={s.underline} onClick={() => c().toggleUnderline().run()}><Underline className={icon} aria-hidden="true" /></Btn>
        <Btn label="Hervorheben" active={s.highlight} onClick={() => c().toggleHighlight().run()}><Highlighter className={icon} aria-hidden="true" /></Btn>
        <Sep />
        <Btn label="Aufzählung" active={s.bullet} onClick={() => c().toggleBulletList().run()}><List className={icon} aria-hidden="true" /></Btn>
        <Btn label="Nummerierung" active={s.ordered} onClick={() => c().toggleOrderedList().run()}><ListOrdered className={icon} aria-hidden="true" /></Btn>
        <Btn label="Zitat" active={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote className={icon} aria-hidden="true" /></Btn>
        <Btn label="Bibelstelle" active={s.bible || bibleOpen} onClick={() => setBibleOpen((o) => !o)}><BookOpen className={icon} aria-hidden="true" /></Btn>
        <Btn
          label="Notiz (nicht vorlesen)"
          active={s.note}
          onClick={() => {
            if (s.note) c().lift("note").run();
            else if (!c().wrapIn("note").run()) c().insertBlock("note").run(); // in Überschriften: neue Notiz darunter
          }}
        ><NotebookPen className={icon} aria-hidden="true" /></Btn>
        <Btn label="Trennlinie" onClick={() => c().setHorizontalRule().run()}><Minus className={icon} aria-hidden="true" /></Btn>
        <Sep />
        <Btn label="Rückgängig (⌘Z)" disabled={!s.canUndo} onClick={() => c().undo().run()}><Undo2 className={icon} aria-hidden="true" /></Btn>
        <Btn label="Wiederholen (⇧⌘Z)" disabled={!s.canRedo} onClick={() => c().redo().run()}><Redo2 className={icon} aria-hidden="true" /></Btn>
      </div>
      {bibleOpen && (
        <BibleForm
          key={s.bible ? `edit-${s.bibleAttrs.reference}` : "new"}
          editing={s.bible}
          initial={s.bible ? s.bibleAttrs : {}}
          onCancel={() => setBibleOpen(false)}
          onSubmit={({ text, ...attrs }) => {
            if (s.bible) c().updateAttributes("bibleBlock", attrs).run();
            else c().insertBlock("bibleBlock", attrs, text).run();
            setBibleOpen(false);
          }}
          onRemove={
            s.bible
              ? () => {
                  c().lift("bibleBlock").run();
                  setBibleOpen(false);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function BibleForm({
  editing,
  initial,
  onSubmit,
  onCancel,
  onRemove,
}: {
  editing: boolean;
  initial: { reference?: string; translation?: string };
  onSubmit: (attrs: { reference: string; translation: string; text: string }) => void;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const [reference, setReference] = useState(initial.reference ?? "");
  const [translation, setTranslation] = useState(initial.translation || "Luther 1912");
  const [text, setText] = useState("");
  const parsed = reference.trim() ? parseRef(reference) : undefined;

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-2 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ reference: parsed ? formatRef(parsed) : reference.trim(), translation: translation.trim(), text });
      }}
    >
      <div className="min-w-40 flex-1">
        <label htmlFor="bible-ref" className="label">Bibelstelle</label>
        <input id="bible-ref" autoFocus value={reference} onChange={(e) => setReference(e.target.value)} placeholder="z. B. Hebr 11,1-3" className="input bg-surface" required />
        <p className="mt-1 text-xs text-muted" aria-live="polite">
          {reference.trim() ? (parsed ? `Erkannt: ${formatRef(parsed, "name")}` : "Nicht erkannt – wird so übernommen") : "z. B. „Joh 3,16“ oder „Röm 8,28-30“"}
        </p>
      </div>
      <div className="min-w-40 flex-1">
        <label htmlFor="bible-tr" className="label">Übersetzung</label>
        <input id="bible-tr" list="bible-translations" value={translation} onChange={(e) => setTranslation(e.target.value)} className="input bg-surface" />
        <datalist id="bible-translations">
          {TRANSLATIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>
      {!editing && (
        <div className="w-full">
          <label htmlFor="bible-text" className="label">Verstext (optional)</label>
          <textarea
            id="bible-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Vers hier einfügen – oder leer lassen und danach im Block schreiben. Ab Phase 4 kommt der Text automatisch aus der Bibel."
            className="input bg-surface py-2 font-serif"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary">{editing ? "Übernehmen" : "Einfügen"}</button>
        {onRemove && <button type="button" className="btn-secondary" onClick={onRemove}>Block lösen</button>}
        <button type="button" className="btn-secondary" onClick={onCancel}>Abbrechen</button>
      </div>
    </form>
  );
}
