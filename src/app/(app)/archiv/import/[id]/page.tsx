import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Undo2 } from "lucide-react";
import { IMPORT_STATUS, type ImportStatus } from "@/db/schema";
import { jobItems, jobSummary } from "@/lib/import";
import { undoImport } from "@/lib/actions/import";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Import-Bericht" };

const LABEL: Record<ImportStatus, string> = { importiert: "Importiert", doppelt: "Schon vorhanden", uebersprungen: "Übersprungen", fehler: "Fehler" };
const STYLE: Record<ImportStatus, string> = {
  importiert: "border-ok text-ok",
  doppelt: "border-border-strong text-ink-2",
  uebersprungen: "border-border-strong text-muted",
  fehler: "border-danger text-danger",
};

export default async function ImportReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }> }) {
  await requireUser();
  const { id } = await params;
  const job = jobSummary(id);
  if (!job) notFound();
  const requested = (await searchParams).status;
  const status = IMPORT_STATUS.includes(requested as ImportStatus) ? (requested as ImportStatus) : undefined;
  const items = jobItems(id, status);
  const total = Object.values(job.counts).reduce((s, n) => s + (n ?? 0), 0);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7 px-5 py-8 sm:px-10 sm:py-10">
      <Link href="/archiv/import" className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Importieren
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">Import vom {formatDateTime(job.createdAt)}</span>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{job.label}</h1>
          {!job.finishedAt && <p className="text-sm text-danger">Dieser Import wurde abgebrochen oder läuft noch.</p>}
          {job.undoneAt && <p className="text-sm text-muted">Rückgängig gemacht am {formatDateTime(job.undoneAt)} – die Dokumente liegen im Papierkorb.</p>}
        </div>
        {!job.undoneAt && (job.counts.importiert ?? 0) > 0 && (
          <form action={undoImport}>
            <input type="hidden" name="id" value={id} />
            <SubmitButton className="btn-secondary" confirm={`Alle ${job.counts.importiert} importierten Dokumente in den Papierkorb legen? Sie bleiben dort 30 Tage wiederherstellbar.`}>
              <Undo2 className="size-4" aria-hidden="true" /> Import rückgängig machen
            </SubmitButton>
          </form>
        )}
      </div>

      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        <Link href="?" aria-current={!status ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm ${!status ? "border-accent bg-accent-soft font-semibold" : "border-border bg-surface"}`}>
          Alle {total}
        </Link>
        {IMPORT_STATUS.map((s) => (
          <Link key={s} href={`?status=${s}`} aria-current={status === s ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm ${status === s ? "border-accent bg-accent-soft font-semibold" : "border-border bg-surface"}`}>
            {LABEL[s]} {job.counts[s] ?? 0}
          </Link>
        ))}
      </nav>

      {(job.counts.importiert ?? 0) > 0 && !job.undoneAt && (
        <p className="text-[15px] text-ink-2">
          Tipp: Titel, Art und Bibelstellen wurden aus den Dateinamen gelesen. Stimmt etwas nicht, korrigierst du es direkt im Dokument. Im{" "}
          <Link href="/archiv">Archiv</Link> kannst du nach Art, Jahr, Reihe und Bibelstelle filtern.
        </p>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {items.length === 0 && <li className="px-5 py-6 text-muted">Keine Einträge.</li>}
        {items.slice(0, 2000).map((it) => (
          <li key={it.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3">
            <span className={`mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${STYLE[it.status]}`}>{LABEL[it.status]}</span>
            <span className="flex min-w-0 flex-[1_1_300px] flex-col gap-0.5">
              {it.documentId && it.title !== null && !it.deletedAt ? (
                <Link href={`/archiv/${it.documentId}`} className="font-medium">{it.title || "Ohne Titel"}</Link>
              ) : null}
              <span className="font-mono text-xs break-all text-muted">{it.path}</span>
              {it.message && <span className="text-sm text-ink-2">{it.message}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
