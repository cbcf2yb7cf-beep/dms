import Link from "next/link";
import { Star } from "lucide-react";
import type { ListItem } from "@/lib/documents";
import { STATUS_LABELS, TYPE_LABELS } from "@/lib/doc-meta";
import { formatDay, formatRelative } from "@/lib/format";
import { formatRef, parseRef } from "@/lib/bible/refs";
import { Hits } from "@/components/bible/hits";

const STATUS_STYLE = {
  entwurf: "border-border-strong text-ink-2",
  fertig: "border-accent text-accent",
  gehalten: "border-ok text-ok",
} as const;

export function mainRefLabel(mainRef: string) {
  const r = mainRef.trim() ? parseRef(mainRef) : undefined;
  return r ? formatRef(r) : mainRef;
}

/** Dokumentzeilen für Archiv und Dashboard. `actions` rendert rechts zusätzliche Knöpfe (z. B. im Papierkorb). */
export function DocumentList({ items, actions, link = true, now = Date.now() }: { items: ListItem[]; actions?: (item: ListItem) => React.ReactNode; link?: boolean; now?: number }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {items.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-surface-2/60 sm:px-6">
          <Wrap href={link ? `/archiv/${d.id}` : undefined} className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5">
            <span className="flex items-baseline gap-2">
              <span className="truncate font-serif text-xl font-semibold">{d.title || <span className="text-muted italic">Ohne Titel</span>}</span>
              {d.favorite && <Star className="size-4 shrink-0 translate-y-0.5 fill-accent text-accent" aria-label="Favorit" />}
            </span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span className="text-ink-2">{TYPE_LABELS[d.type]}</span>
              {d.mainRef && <span>· {mainRefLabel(d.mainRef)}</span>}
              {d.heldOn && <span>· {formatDay(d.heldOn)}</span>}
              {d.series && <span>· {d.series}</span>}
              {d.occasion && <span>· {d.occasion}</span>}
            </span>
            {d.snippet && <span className="font-serif text-[15px] leading-relaxed text-ink-2"><Hits text={d.snippet} /></span>}
            {d.topics.length > 0 && (
              <span className="flex flex-wrap gap-1.5 pt-0.5">
                {d.topics.slice(0, 6).map((t) => (
                  <span key={t} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-ink-2">{t}</span>
                ))}
              </span>
            )}
          </Wrap>
          <span className="flex shrink-0 items-center gap-3 text-sm text-muted">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_STYLE[d.status]}`}>{STATUS_LABELS[d.status]}</span>
            <span className="hidden w-28 text-right sm:inline" title="Zuletzt bearbeitet">{formatRelative(d.updatedAt, now)}</span>
            {actions?.(d)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Wrap({ href, className, children }: { href?: string; className: string; children: React.ReactNode }) {
  return href ? <Link href={href} className={className}>{children}</Link> : <div className={className}>{children}</div>;
}
