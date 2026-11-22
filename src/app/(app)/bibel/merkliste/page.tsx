import Link from "next/link";
import { splitId } from "@/lib/bible/refs";
import { bibleAvailable, DEFAULT_TRANSLATION, verseLabel, versesInRange } from "@/lib/bible/db";
import { allBookmarks, allNotes } from "@/lib/bible/notes";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { BibleTabs } from "@/components/bible/bible-tabs";

export const metadata = { title: "Merkliste" };

export default async function BookmarksPage() {
  await requireUser();
  const marks = allBookmarks();
  const notes = allNotes();
  const text = (id: number) => (bibleAvailable() ? versesInRange(DEFAULT_TRANSLATION, id, id)[0]?.text ?? "" : "");
  const href = (id: number) => {
    const s = splitId(id);
    return `/bibel?b=${s.book}&c=${s.chapter}&v=${s.verse}#v${s.verse}`;
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-5 py-8 sm:px-10">
      <BibleTabs active="/bibel/merkliste" />
      <section className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl font-semibold">Gemerkte Verse</h1>
        {marks.length === 0 ? (
          <p className="text-muted">Noch keine. Klick beim Lesen auf eine Versnummer und dann auf „Merken“.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {marks.map((m) => (
              <li key={m.verseId} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-4">
                <Link href={href(m.verseId)} className="w-40 shrink-0 text-sm font-semibold">{verseLabel(m.verseId)}</Link>
                <p className="font-serif text-[16px] leading-relaxed">{text(m.verseId)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Notizen zu Versen</h2>
        {notes.length === 0 ? (
          <p className="text-muted">Noch keine Notizen.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {notes.map((n) => (
              <li key={n.verseId} className="flex flex-col gap-1 px-5 py-3">
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={href(n.verseId)} className="text-sm font-semibold">{verseLabel(n.verseId)}</Link>
                  <span className="text-xs text-muted">{formatDateTime(n.updatedAt)}</span>
                </span>
                <p className="text-[15px] whitespace-pre-line">{n.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
