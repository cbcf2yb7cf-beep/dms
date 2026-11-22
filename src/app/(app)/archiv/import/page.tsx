import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Importer } from "@/components/importer";
import { PageHeader } from "@/components/page-header";
import { listJobs } from "@/lib/import";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Importieren" };

export default async function ImportPage() {
  await requireUser();
  const jobs = listJobs();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-7 px-5 py-8 sm:px-10 sm:py-10">
      <Link href="/archiv" className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Archiv
      </Link>
      <PageHeader title="Vorhandene Dateien importieren" />
      <Importer />

      {jobs.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="eyebrow">Bisherige Importe</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link href={`/archiv/import/${j.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 hover:bg-surface-2/60">
                  <span className="font-medium">{j.label}</span>
                  <span className="text-sm text-muted">
                    {formatDateTime(j.createdAt)} · {j.counts.importiert ?? 0} importiert
                    {j.undoneAt ? " · rückgängig gemacht" : !j.finishedAt ? " · abgebrochen" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
