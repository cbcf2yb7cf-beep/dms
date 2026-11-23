import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { NewTopicForm } from "@/components/topic-forms";
import { bookCounts, listTopics, seriesCounts, untaggedCount, type TopicRow } from "@/lib/topics";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Themen" };

export default async function TopicsPage() {
  await requireUser();
  const topics = listTopics();
  const series = seriesCounts();
  const books = bookCounts();
  const untagged = untaggedCount();
  const roots = topics.filter((t) => !t.parentId || !topics.some((p) => p.id === t.parentId));
  const children = (id: string) => topics.filter((t) => t.parentId === id);
  const maxBook = Math.max(1, ...books.map((b) => b.n));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader title="Themen" />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="eyebrow">Themen ({topics.length})</h2>
          <NewTopicForm />
        </div>
        {topics.length === 0 ? (
          <p className="card text-ink-2">Noch keine Themen. Du vergibst sie im Dokument rechts unter „Themen“ – beim Import entstehen sie aus Unterordnern.</p>
        ) : (
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {roots.map((t) => (
              <TopicItem key={t.id} t={t} sub={children(t.id)} />
            ))}
          </ul>
        )}
        {untagged > 0 && (
          <p className="text-sm text-muted">{untagged.toLocaleString("de-DE")} Dokumente haben noch kein Thema.</p>
        )}
      </section>

      {series.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="eyebrow">Reihen</h2>
          <ul className="flex flex-wrap gap-2">
            {series.map((s) => (
              <li key={s.name}>
                <Link href={`/archiv?reihe=${encodeURIComponent(s.name)}&sort=gehalten`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-[15px] text-ink hover:border-border-strong">
                  {s.name} <span className="text-sm text-muted">{s.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {books.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="eyebrow">Bibelbücher als Haupttext</h2>
          <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((b) => (
              <li key={b.book}>
                <Link href={`/archiv?buch=${b.book}`} className="flex items-center gap-2 text-sm text-ink-2 no-underline hover:text-ink">
                  <span className="w-36 shrink-0 truncate">{b.name}</span>
                  <span className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(4, (b.n / maxBook) * 120)}px` }} aria-hidden="true" />
                  <span className="text-muted">{b.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TopicItem({ t, sub }: { t: TopicRow; sub: TopicRow[] }) {
  return (
    <li className="flex flex-col py-1">
      <Link href={`/themen/${t.id}`} className="flex min-h-9 items-center justify-between gap-2 rounded-md px-2 text-ink no-underline hover:bg-surface-2">
        <span className="font-medium">{t.name}</span>
        <span className="text-sm text-muted">{t.n}</span>
      </Link>
      {sub.length > 0 && (
        <ul className="ml-4 border-l border-border pl-2">
          {sub.map((s) => (
            <li key={s.id}>
              <Link href={`/themen/${s.id}`} className="flex min-h-8 items-center justify-between gap-2 rounded-md px-2 text-[15px] text-ink-2 no-underline hover:bg-surface-2">
                <span>{s.name}</span>
                <span className="text-sm text-muted">{s.n}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
