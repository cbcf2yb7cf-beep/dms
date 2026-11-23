import { Fragment } from "react";
import Link from "next/link";
import { markdownToDoc } from "@/lib/ai/markdown";
import type { JSONNode } from "@/lib/content";

/** Claude-Antwort lesbar darstellen; [n] wird auf Wunsch zum Link auf die Quelle. */
export function MarkdownView({ text, sources }: { text: string; sources?: { id: string; title: string }[] }) {
  const doc = markdownToDoc(text);
  const inline = (nodes: JSONNode[] = []) =>
    nodes.map((n, i) => {
      const parts = (n.text ?? "").split(/(\[\d+(?:,\s*\d+)*\])/g);
      const rendered = parts.map((p, j) => {
        const m = /^\[(\d+(?:,\s*\d+)*)\]$/.exec(p);
        if (!m || !sources) return <Fragment key={j}>{p}</Fragment>;
        return (
          <sup key={j} className="mx-0.5">
            {m[1].split(/,\s*/).map((num, k) => {
              const s = sources[Number(num) - 1];
              return s ? (
                <Link key={k} href={`/archiv/${s.id}`} title={s.title} className="mx-px rounded bg-accent-soft px-1 text-xs font-semibold no-underline">{num}</Link>
              ) : (
                <span key={k}>{num}</span>
              );
            })}
          </sup>
        );
      });
      return n.marks?.some((mk) => mk.type === "bold") ? <strong key={i}>{rendered}</strong> : <Fragment key={i}>{rendered}</Fragment>;
    });
  return (
    <div className="flex flex-col gap-3 text-[16px] leading-relaxed">
      {(doc.content ?? []).map((b, i) => {
        if (b.type === "heading") return <h3 key={i} className={`font-serif font-semibold ${b.attrs?.level === 2 ? "mt-2 text-xl" : "text-lg"}`}>{inline(b.content)}</h3>;
        if (b.type === "bulletList" || b.type === "orderedList") {
          const L = b.type === "orderedList" ? "ol" : "ul";
          return (
            <L key={i} className={`flex flex-col gap-1 pl-6 ${L === "ol" ? "list-decimal" : "list-disc"}`}>
              {(b.content ?? []).map((li, j) => <li key={j}>{inline(li.content?.[0]?.content)}</li>)}
            </L>
          );
        }
        return <p key={i}>{inline(b.content)}</p>;
      })}
    </div>
  );
}
