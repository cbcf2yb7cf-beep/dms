import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { splitId } from "@/lib/bible/refs";
import { listDocuments } from "@/lib/documents";
import { chaptersForTopic, getTopic, listTopics, relatedTopics } from "@/lib/topics";
import { deleteTopicAction } from "@/lib/actions/topics";
import { requireUser } from "@/lib/session";
import { DocumentList } from "@/components/document-list";
import { ParentTopicForm, RenameTopicForm } from "@/components/topic-forms";
import { SubmitButton } from "@/components/submit-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: getTopic((await params).id)?.name ?? "Thema" };
}

export default async function TopicPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ zusammengefuehrt?: string }> }) {
  await requireUser();
  const { id } = await params;
  const topic = getTopic(id);
  if (!topic) notFound();
  const all = listTopics();
  const parent = topic.parentId ? all.find((t) => t.id === topic.parentId) : undefined;
  const children = all.filter((t) => t.parentId === id);
  const docs = listDocuments({ topic: topic.name, sort: "gehalten" }).items;
  const related = relatedTopics(id);
  const chapters = chaptersForTopic(id);
  const years = [...new Set(docs.map((d) => d.heldOn?.slice(0, 4)).filter(Boolean))].sort();
  const merged = (await searchParams).zusammengefuehrt;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-8 sm:px-10 sm:py-10">
      <Link href="/themen" className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> Alle Themen
      </Link>
      <header className="flex flex-col gap-2">
        {parent && <Link href={`/themen/${parent.id}`} className="text-sm">{parent.name}</Link>}
        <h1 className="font-serif text-4xl font-semibold tracking-tight">{topic.name}</h1>
        <p className="text-ink-2">
          {docs.length === 1 ? "1 Dokument" : `${docs.length} Dokumente`}
          {years.length > 0 && <> · {years[0] === years.at(-1) ? years[0] : `${years[0]}–${years.at(-1)}`}</>}
        </p>
        {merged && <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">Themen zusammengeführt.</p>}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="eyebrow">Dokumente</h2>
          {docs.length ? <DocumentList items={docs} /> : <p className="card text-muted">Keine Dokumente mit diesem Thema.</p>}
        </section>

        <aside className="flex flex-col gap-7">
          {children.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="eyebrow">Unterthemen</h2>
              <ul className="flex flex-wrap gap-2">
                {children.map((c) => <li key={c.id}><Link href={`/themen/${c.id}`} className="inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-3 text-sm no-underline">{c.name} <span className="ml-1.5 text-muted">{c.n}</span></Link></li>)}
              </ul>
            </section>
          )}
          {related.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="eyebrow">Oft zusammen mit</h2>
              <ul className="flex flex-wrap gap-2">
                {related.map((r) => <li key={r.id}><Link href={`/themen/${r.id}`} className="inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-3 text-sm no-underline">{r.name} <span className="ml-1.5 text-muted">{r.n}</span></Link></li>)}
              </ul>
            </section>
          )}
          {chapters.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="eyebrow">Häufige Bibelstellen</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {chapters.map((c) => {
                  const s = splitId(c.chapter * 1000 + 1);
                  return (
                    <li key={c.chapter} className="flex justify-between gap-2">
                      <Link href={`/bibel?b=${s.book}&c=${s.chapter}`}>{c.label}</Link>
                      <span className="text-muted">{c.n}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <section className="card flex flex-col gap-5 p-5">
            <h2 className="eyebrow">Verwalten</h2>
            <RenameTopicForm id={topic.id} name={topic.name} />
            <ParentTopicForm id={topic.id} parentId={topic.parentId} options={all.filter((t) => t.id !== id).map((t) => ({ id: t.id, name: t.name }))} />
            <form action={deleteTopicAction}>
              <input type="hidden" name="id" value={topic.id} />
              <SubmitButton className="btn-secondary text-danger" confirm={`Thema „${topic.name}“ löschen? Die Dokumente bleiben erhalten, nur die Zuordnung entfällt.`}>
                <Trash2 className="size-4" aria-hidden="true" /> Thema löschen
              </SubmitButton>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
