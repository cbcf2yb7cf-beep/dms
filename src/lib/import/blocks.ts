import type { JSONNode } from "@/lib/content";

// Bausteine für Tiptap-JSON (Editor-Format).

export type Mark = { type: string; attrs?: Record<string, unknown> };

export const text = (t: string, marks?: Mark[]): JSONNode => (marks?.length ? { type: "text", text: t, marks } : { type: "text", text: t });
export const paragraph = (content: JSONNode[] = []): JSONNode => (content.length ? { type: "paragraph", content } : { type: "paragraph" });
export const heading = (level: number, t: string): JSONNode => ({ type: "heading", attrs: { level }, content: [text(t)] });
export const list = (ordered: boolean, items: JSONNode[][]): JSONNode => ({
  type: ordered ? "orderedList" : "bulletList",
  content: items.map((blocks) => ({ type: "listItem", content: blocks.length ? blocks : [paragraph()] })),
});
export const doc = (content: JSONNode[]): JSONNode => ({ type: "doc", content: content.length ? content : [paragraph()] });

/** Reiner Text eines Knotens. */
export function nodeText(node: JSONNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(nodeText).join("");
}

/**
 * Überschrift erkennen, wenn Word keine Formatvorlage benutzt hat:
 * kurz, ohne Satzzeichen am Ende. GROSSBUCHSTABEN → Ebene 2, sonst Ebene 3.
 */
export function headingLevelFor(t: string): number | null {
  const s = t.trim();
  if (s.length < 2 || s.length > 90) return null;
  if (/[.,;!?]$/.test(s) && !/\.\.\.$/.test(s)) return null;
  const letters = s.replace(/[^\p{L}]/gu, "");
  if (letters.length < 2) return null;
  return letters === letters.toUpperCase() ? 2 : 3;
}
