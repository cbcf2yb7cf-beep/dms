import { HIT_END, HIT_START } from "@/lib/bible/db";

/** Text mit Treffermarkierungen (\u0001…\u0002 aus der Konkordanz) sicher darstellen. */
export function Hits({ text }: { text: string }) {
  const parts = text.split(new RegExp(`(${HIT_START}[^${HIT_END}]*${HIT_END})`));
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith(HIT_START) ? (
          <mark key={i} className="rounded bg-accent-soft px-0.5 text-ink">{p.slice(1, -1)}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
