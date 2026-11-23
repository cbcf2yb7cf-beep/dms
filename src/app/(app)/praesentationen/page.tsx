import Link from "next/link";
import { Copy, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SlideView } from "@/components/slides/slide-view";
import { SubmitButton } from "@/components/submit-button";
import { listPresentations } from "@/lib/presentations";
import { deletePresentationAction, duplicatePresentationAction, newPresentation } from "@/lib/actions/presentations";
import { THEME_IDS, type ThemeId } from "@/lib/slides/types";
import { formatRelative } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Präsentationen" };

export default async function PresentationsPage() {
  await requireUser();
  const list = listPresentations();
  const now = Date.now();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader title="Präsentationen">
        <form action={newPresentation}>
          <SubmitButton className="btn-primary"><Plus className="size-4" aria-hidden="true" /> Neue Präsentation</SubmitButton>
        </form>
      </PageHeader>
      <p className="text-ink-2">Tipp: Im Dokument oben auf <strong>„Folien“</strong> klicken – dann entsteht aus deiner Gliederung, den Bibel-Blöcken und Zitaten ein fertiger Entwurf.</p>
      {list.length === 0 ? (
        <p className="card text-ink-2">Noch keine Präsentationen.</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <li key={p.id} className="card flex flex-col gap-3 p-3">
              <Link href={`/praesentationen/${p.id}`} className="overflow-hidden rounded-lg border border-border">
                <SlideView slide={p.first} theme={(THEME_IDS.includes(p.theme as ThemeId) ? p.theme : "anthrazit") as ThemeId} />
              </Link>
              <div className="flex items-start justify-between gap-2 px-1">
                <div className="min-w-0">
                  <Link href={`/praesentationen/${p.id}`} className="block truncate font-semibold text-ink no-underline">{p.title || "Ohne Titel"}</Link>
                  <span className="text-sm text-muted">{p.slideCount} Folien · {formatRelative(p.updatedAt, now)}</span>
                </div>
                <div className="flex shrink-0">
                  <form action={duplicatePresentationAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton className="inline-flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2"><Copy className="size-4" aria-label="Duplizieren" /></SubmitButton>
                  </form>
                  <form action={deletePresentationAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton className="inline-flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-danger" confirm={`Präsentation „${p.title || "Ohne Titel"}“ endgültig löschen?`}><Trash2 className="size-4" aria-label="Löschen" /></SubmitButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
