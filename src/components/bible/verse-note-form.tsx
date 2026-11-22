"use client";

import { useActionState } from "react";
import { saveVerseNote } from "@/lib/actions/bible";
import { FormMessage, SubmitButton } from "@/components/submit-button";

export function VerseNoteForm({ verse, initial }: { verse: number; initial: string }) {
  const [state, formAction] = useActionState(saveVerseNote, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="verse" value={verse} />
      <label htmlFor={`note-${verse}`} className="label mb-0">Meine Notiz</label>
      <textarea id={`note-${verse}`} name="text" defaultValue={initial} rows={3} className="input py-2" placeholder="Gedanken, Beispiele, Bezüge …" />
      <FormMessage state={state} />
      <div>
        <SubmitButton className="btn-secondary min-h-10 px-3 text-sm">Notiz speichern</SubmitButton>
      </div>
    </form>
  );
}
