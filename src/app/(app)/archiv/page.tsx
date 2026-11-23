import Link from "next/link";
import { BookOpen, Search, Upload, X } from "lucide-react";
import { DOC_STATUS, DOC_TYPES, type DocStatus, type DocType } from "@/db/schema";
import { facets, listDocuments, type ListFilter } from "@/lib/documents";
import { STATUS_OPTIONS, TYPE_OPTIONS } from "@/lib/doc-meta";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { NewDocumentMenu } from "@/components/new-document-menu";
import { DocumentList } from "@/components/document-list";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { bookByNumber } from "@/lib/bible/books";

export const metadata = { title: "Archiv" };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

const SORTS = [
  ["relevanz", "Relevanz"],
  ["bearbeitet", "Zuletzt bearbeitet"],
  ["gehalten", "Gehalten am"],
  ["titel", "Titel A–Z"],
  ["erstellt", "Neu angelegt"],
] as const;

export default async function ArchivePage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireUser();
  const p = await searchParams;
  const view = one(p.ansicht) === "archiv" ? "archiv" : "aktiv";
  const filter: ListFilter = {
    view,
    q: one(p.q),
    stelle: one(p.stelle),
    type: DOC_TYPES.includes(one(p.art) as DocType) ? (one(p.art) as DocType) : undefined,
    status: DOC_STATUS.includes(one(p.status) as DocStatus) ? (one(p.status) as DocStatus) : undefined,
    topic: one(p.thema),
    tag: one(p.schlagwort),
    series: one(p.reihe),
    year: one(p.jahr),
    favorite: one(p.favoriten) === "1",
    book: Number(one(p.buch)) || undefined,
    sort: SORTS.find(([k]) => k === one(p.sort))?.[0] as ListFilter["sort"], // ohne Angabe: Relevanz bei Suche, sonst zuletzt bearbeitet
  };
  const { items, stelle } = listDocuments(filter);
  const f = facets();
  const filtered = Boolean(filter.book || filter.q || filter.stelle || filter.type || filter.status || filter.topic || filter.tag || filter.series || filter.year || filter.favorite);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader title="Archiv">
        <Link href="/archiv/import" className="btn-secondary">
          <Upload className="size-4" aria-hidden="true" /> Importieren
        </Link>
        <NewDocumentMenu />
      </PageHeader>

      <nav aria-label="Ansicht" className="flex gap-1 border-b border-border">
        {[
          ["aktiv", "Dokumente", "/archiv"],
          ["archiv", "Archiviert", "/archiv?ansicht=archiv"],
          ["papierkorb", "Papierkorb", "/archiv/papierkorb"],
        ].map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={view === key ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-[15px] ${view === key ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <AutoSubmitForm className="flex flex-col gap-3">
        {view === "archiv" && <input type="hidden" name="ansicht" value="archiv" />}
        <div className="flex flex-wrap gap-3">
          <label className="flex min-h-11 flex-[2_1_280px] items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 focus-within:border-accent">
            <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="sr-only">Suchbegriff</span>
            <input name="q" defaultValue={filter.q} placeholder="Suchen – Wortformen zählen mit („vergeben“ findet „Vergebung“)" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted" />
          </label>
          <label className="flex min-h-11 flex-[1_1_200px] items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 focus-within:border-accent">
            <BookOpen className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="sr-only">Bibelstelle</span>
            <input name="stelle" defaultValue={filter.stelle} placeholder="Bibelstelle, z. B. Röm 8" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted" />
          </label>
          <button type="submit" className="btn-primary">Suchen</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select name="art" label="Art" value={filter.type} options={TYPE_OPTIONS} />
          <Select name="status" label="Status" value={filter.status} options={STATUS_OPTIONS} />
          {f.topics.length > 0 && <Select name="thema" label="Thema" value={filter.topic} options={f.topics.map((t) => [t, t])} />}
          {f.series.length > 0 && <Select name="reihe" label="Reihe" value={filter.series} options={f.series.map((t) => [t, t])} />}
          {f.years.length > 0 && <Select name="jahr" label="Jahr" value={filter.year} options={f.years.map((t) => [t, t])} />}
          {filter.tag && <input type="hidden" name="schlagwort" value={filter.tag} />}
        {filter.book && <input type="hidden" name="buch" value={filter.book} />}
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 text-sm">
            <input type="checkbox" name="favoriten" value="1" defaultChecked={filter.favorite} className="size-4 accent-[var(--accent)]" /> Nur Favoriten
          </label>
          <span className="ml-auto" />
          <Select name="sort" label="Sortierung" value={filter.sort} options={(filter.q ? SORTS.slice(1) : SORTS.slice(2)) as unknown as [string, string][]} placeholder={filter.q ? "Relevanz" : "Zuletzt bearbeitet"} />
        </div>
      </AutoSubmitForm>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted" aria-live="polite">
        <span>
          {items.length === 1 ? "1 Dokument" : `${items.length.toLocaleString("de-DE")} Dokumente`}
          {stelle && (
            <>
              {" "}zu <strong className="text-ink">{stelle}</strong>
            </>
          )}
          {filter.stelle && !stelle && <span className="text-danger"> – „{filter.stelle}“ ist keine erkannte Bibelstelle</span>}
          {filter.tag && <> mit Schlagwort <strong className="text-ink">{filter.tag}</strong></>}
          {filter.book && filter.book <= 66 && <> zu <strong className="text-ink">{bookByNumber(filter.book).name}</strong></>}
        </span>
        {filtered && (
          <Link href={view === "archiv" ? "/archiv?ansicht=archiv" : "/archiv"} className="inline-flex min-h-11 items-center gap-1 text-ink-2 hover:text-ink">
            <X className="size-4" aria-hidden="true" /> Filter zurücksetzen
          </Link>
        )}
      </div>

      {items.length > 0 ? (
        <DocumentList items={items} />
      ) : (
        <div className="card flex flex-col items-start gap-3 py-10">
          <p className="font-serif text-2xl font-semibold">{filtered ? "Nichts gefunden" : view === "archiv" ? "Nichts archiviert" : "Noch keine Dokumente"}</p>
          <p className="max-w-lg text-ink-2">
            {filtered
              ? "Versuch es mit weniger Filtern oder einem anderen Suchbegriff."
              : view === "archiv"
                ? "Archivierte Dokumente verschwinden aus der normalen Liste, bleiben aber hier und in der Suche erhalten."
                : "Leg deine erste Predigt an – oder übernimm vorhandene Word-, PowerPoint- und PDF-Dateien über „Importieren“."}
          </p>
          {!filtered && view === "aktiv" && <NewDocumentMenu />}
        </div>
      )}
    </div>
  );
}

function Select({ name, label, value, options, placeholder }: { name: string; label: string; value?: string; options: readonly (readonly [string, string])[]; placeholder?: string }) {
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="min-h-11 rounded-lg border border-border-strong bg-surface px-3 text-sm">
        <option value="">{placeholder ?? `${label}: alle`}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
