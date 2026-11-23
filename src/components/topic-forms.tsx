"use client";

import { useActionState } from "react";
import { createTopicAction, renameTopicAction, setParentAction } from "@/lib/actions/topics";
import { FormMessage, SubmitButton } from "./submit-button";

export function RenameTopicForm({ id, name }: { id: string; name: string }) {
  const [state, action] = useActionState(renameTopicAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="t-name" className="label mb-0">Umbenennen oder zusammenführen</label>
      <div className="flex flex-wrap gap-2">
        <input id="t-name" name="name" defaultValue={name} className="input max-w-sm" required />
        <SubmitButton className="btn-secondary">Speichern</SubmitButton>
      </div>
      <p className="text-xs text-muted">Heißt schon ein anderes Thema so, werden beide zu einem zusammengeführt – alle Dokumente bleiben zugeordnet.</p>
      <FormMessage state={state} />
    </form>
  );
}

export function ParentTopicForm({ id, parentId, options }: { id: string; parentId: string | null; options: { id: string; name: string }[] }) {
  const [state, action] = useActionState(setParentAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="t-parent" className="label mb-0">Oberthema</label>
      <div className="flex flex-wrap gap-2">
        <select id="t-parent" name="parent" defaultValue={parentId ?? ""} className="input max-w-sm">
          <option value="">— keins —</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <SubmitButton className="btn-secondary">Speichern</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function NewTopicForm() {
  const [state, action] = useActionState(createTopicAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="new-topic" className="label">Neues Thema</label>
        <input id="new-topic" name="name" placeholder="z. B. Heiligung" className="input w-56" required />
      </div>
      <SubmitButton className="btn-secondary">Anlegen</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
