import Link from "next/link";
import { RotateCcw, Trash2 } from "lucide-react";
import { listDocuments, purgeTrash, TRASH_DAYS } from "@/lib/documents";
import { requireUser } from "@/lib/session";
import { destroyDocument, untrashDocument } from "@/lib/actions/documents";
import { DocumentList } from "@/components/document-list";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { formatDay } from "@/lib/format";

export const metadata = { title: "Papierkorb" };

export default async function TrashPage() {
  await requireUser();
  purgeTrash();
  const { items } = listDocuments({ view: "papierkorb", sort: "bearbeitet" });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader title="Papierkorb" />
      <nav aria-label="Ansicht" className="flex gap-1 border-b border-border">
        <Link href="/archiv" className="-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-4 text-[15px] text-muted hover:text-ink">Dokumente</Link>
        <Link href="/archiv?ansicht=archiv" className="-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-4 text-[15px] text-muted hover:text-ink">Archiviert</Link>
        <span aria-current="page" className="-mb-px inline-flex min-h-11 items-center border-b-2 border-accent px-4 text-[15px] font-semibold">Papierkorb</span>
      </nav>
      <p className="text-ink-2">Gelöschte Dokumente bleiben {TRASH_DAYS} Tage hier und werden danach endgültig entfernt.</p>
      {items.length === 0 ? (
        <p className="card text-ink-2">Der Papierkorb ist leer.</p>
      ) : (
        <DocumentList
          items={items}
          link={false}
          actions={(d) => {
            const until = d.deletedAt ? new Date(d.deletedAt.getTime() + TRASH_DAYS * 86_400_000).toISOString().slice(0, 10) : null;
            return (
              <span className="flex items-center gap-1.5">
                {until && <span className="hidden text-xs lg:inline">bis {formatDay(until)}</span>}
                <form action={untrashDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <SubmitButton className="btn-secondary min-h-10 px-3 text-sm">
                    <RotateCcw className="size-4" aria-hidden="true" /> Wiederherstellen
                  </SubmitButton>
                </form>
                <form action={destroyDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <SubmitButton className="btn-danger min-h-10 px-3 text-sm" confirm="Endgültig löschen? Das lässt sich nicht rückgängig machen.">
                    <Trash2 className="size-4" aria-hidden="true" /> Endgültig
                  </SubmitButton>
                </form>
              </span>
            );
          }}
        />
      )}
    </div>
  );
}
