import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDocument, getVersion, listVersions } from "@/lib/documents";
import { plainText, type JSONNode } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { restoreVersionAction } from "@/lib/actions/documents";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Versionen" };

const REASON = { auto: "Automatisch", manuell: "Gesichert", wiederhergestellt: "Wiederhergestellt" } as const;

export default async function VersionsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  await requireUser();
  const { id } = await params;
  const doc = getDocument(id);
  if (!doc || doc.deletedAt) notFound();
  const versions = listVersions(id);
  const selectedId = Number((await searchParams).v ?? versions[0]?.id);
  const selected = Number.isInteger(selectedId) ? getVersion(id, selectedId) : undefined;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-10">
      <div className="flex flex-col gap-2">
        <Link href={`/archiv/${id}`} className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" /> Zurück zum Dokument
        </Link>
        <h1 className="font-serif text-3xl font-semibold">Versionen: {doc.title || "Ohne Titel"}</h1>
        <p className="text-ink-2">
          Beim Schreiben wird höchstens alle 5 Minuten automatisch eine Version angelegt. Mit <kbd className="rounded border border-border px-1.5 text-sm">⌘S</kbd> sicherst du jederzeit eine eigene. Beim Wiederherstellen wird der aktuelle Stand vorher gesichert.
        </p>
      </div>

      {versions.length === 0 ? (
        <p className="card text-ink-2">Noch keine Versionen. Die erste entsteht beim ersten Speichern.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <ol className="flex flex-col gap-1 self-start rounded-2xl border border-border bg-surface p-2">
            {versions.map((v) => (
              <li key={v.id}>
                <Link
                  href={`?v=${v.id}`}
                  aria-current={v.id === selected?.id ? "true" : undefined}
                  className={`flex min-h-11 flex-col rounded-lg px-3 py-2 ${v.id === selected?.id ? "bg-accent-soft" : "hover:bg-surface-2"}`}
                >
                  <span className="text-[15px] font-medium">{formatDateTime(v.createdAt)}</span>
                  <span className="text-sm text-muted">{REASON[v.reason]} · {v.wordCount.toLocaleString("de-DE")} Wörter</span>
                </Link>
              </li>
            ))}
          </ol>
          {selected && (
            <section className="card flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm text-muted">Stand vom {formatDateTime(selected.createdAt)}</h2>
                <form action={restoreVersionAction}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="versionId" value={selected.id} />
                  <SubmitButton className="btn-secondary" confirm="Diese Version wiederherstellen? Der aktuelle Stand wird vorher gesichert.">Diese Version wiederherstellen</SubmitButton>
                </form>
              </div>
              <h3 className="font-serif text-3xl font-semibold">{selected.title || "Ohne Titel"}</h3>
              <div className="font-serif text-[18px] leading-relaxed whitespace-pre-line text-ink-2">{plainText(JSON.parse(selected.contentJson) as JSONNode)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
