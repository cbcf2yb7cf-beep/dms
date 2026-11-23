import type { JSONNode } from "@/lib/content";

// Einfaches Markdown aus Claude-Antworten (##, ###, - Punkte, 1. Punkte, **fett**) → Editor-Format.

function inline(text: string): JSONNode[] {
  const out: JSONNode[] = [];
  for (const part of text.split(/(\*\*[^*]+\*\*)/g)) {
    if (!part) continue;
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    out.push(bold ? { type: "text", text: bold[1], marks: [{ type: "bold" }] } : { type: "text", text: part });
  }
  return out;
}

export function markdownToDoc(md: string): JSONNode {
  const blocks: JSONNode[] = [];
  let list: { ordered: boolean; items: JSONNode[] } | null = null;
  const flush = () => {
    if (list) blocks.push({ type: list.ordered ? "orderedList" : "bulletList", content: list.items });
    list = null;
  };
  for (const raw of md.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd();
    const h = /^(#{1,4})\s+(.*)$/.exec(line.trim());
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const num = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (h) {
      flush();
      blocks.push({ type: "heading", attrs: { level: Math.min(4, Math.max(2, h[1].length)) }, content: inline(h[2].replace(/\*\*/g, "")) });
    } else if (bullet || num) {
      const ordered = Boolean(num && !bullet);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push({ type: "listItem", content: [{ type: "paragraph", content: inline((bullet ?? num)![1]) }] });
    } else if (!line.trim()) {
      flush();
    } else {
      flush();
      blocks.push({ type: "paragraph", content: inline(line.trim()) });
    }
  }
  flush();
  return { type: "doc", content: blocks.length ? blocks : [{ type: "paragraph" }] };
}
