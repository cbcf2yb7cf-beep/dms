// Tiptap-Dokumente (JSON) auswerten — ohne Editor, im Server und in Tests nutzbar.

export type JSONNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: JSONNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export const EMPTY_DOC: JSONNode = { type: "doc", content: [{ type: "paragraph" }] };

/** Vorlage für neue Predigten: die übliche Gliederung als Startpunkt. */
export function sermonTemplate(): JSONNode {
  const h = (text: string): JSONNode => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });
  return { type: "doc", content: [h("Einleitung"), { type: "paragraph" }, h("Hauptteil"), { type: "paragraph" }, h("Schluss"), { type: "paragraph" }] };
}

const BLOCKS = new Set(["paragraph", "heading", "blockquote", "listItem", "bibleBlock", "note", "codeBlock", "horizontalRule"]);

/** Reiner Text, Blöcke durch Zeilenumbrüche getrennt. */
export function plainText(doc: JSONNode): string {
  const parts: string[] = [];
  const walk = (node: JSONNode) => {
    if (node.type === "text" && node.text) parts.push(node.text);
    else if (node.type === "hardBreak") parts.push("\n");
    if (node.type === "bibleBlock" && typeof node.attrs?.reference === "string" && node.attrs.reference) {
      parts.push(`${node.attrs.reference}\n`);
    }
    node.content?.forEach(walk);
    if (node.type && BLOCKS.has(node.type)) parts.push("\n");
  };
  walk(doc);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

export function wordCount(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

/** Angaben aus den Bibelstellen-Blöcken (attrs.reference). */
export function blockReferences(doc: JSONNode): string[] {
  const out: string[] = [];
  const walk = (node: JSONNode) => {
    if (node.type === "bibleBlock" && typeof node.attrs?.reference === "string" && node.attrs.reference.trim()) {
      out.push(node.attrs.reference.trim());
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return out;
}

export type OutlineItem = { level: number; text: string; index: number };

/** Überschriften für die Gliederung (index = n-te Überschrift im Dokument). */
export function outline(doc: JSONNode): OutlineItem[] {
  const out: OutlineItem[] = [];
  const walk = (node: JSONNode) => {
    if (node.type === "heading") {
      const text = (node.content ?? []).map((c) => c.text ?? "").join("").trim();
      out.push({ level: Number(node.attrs?.level ?? 2), text, index: out.length });
      return;
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return out;
}

/** Grobe Plausibilitätsprüfung für gespeicherte Inhalte. */
export function isDoc(value: unknown): value is JSONNode {
  return typeof value === "object" && value !== null && (value as JSONNode).type === "doc" && Array.isArray((value as JSONNode).content);
}
