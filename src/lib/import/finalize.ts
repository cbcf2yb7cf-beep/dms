import type { JSONNode } from "@/lib/content";
import { nodeText } from "./blocks";
import { parseFileName, type FileMeta } from "./filename";

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Deine Dateien beginnen meist mit einer Kopfzeile, die den Dateinamen wiederholt
 * ("2014-07-13 Predigt Schneverdingen (Das Leben im Sieg)"). Die wird entfernt, weil
 * Titel und Datum ohnehin in eigenen Feldern stehen. Ist der Titel aus dem Dateinamen
 * nur geraten, kommt er aus dieser Kopfzeile oder der ersten Überschrift.
 */
export function finalizeContent(content: JSONNode, meta: FileMeta, opts: { keepFirst?: boolean } = {}): { content: JSONNode; title: string } {
  const blocks = [...(content.content ?? [])];
  let title = meta.title;
  const first = blocks[0];
  const firstText = first ? nodeText(first).replace(/\s+/g, " ").trim() : "";

  if (!opts.keepFirst && first && (first.type === "paragraph" || first.type === "heading") && firstText && firstText.length <= 160) {
    const n = norm(firstText);
    const isHeaderLine =
      (meta.heldOn && (firstText.includes(meta.heldOn) || n.includes(norm(meta.heldOn)))) ||
      /^\d{4}-\d{1,2}-\d{1,2}\b/.test(firstText) ||
      (!meta.titleGuessed && norm(meta.title).length >= 4 && n.includes(norm(meta.title))) ||
      (meta.occasion && n.startsWith(norm(meta.occasion)) && firstText.length <= 80);
    if (isHeaderLine) {
      blocks.shift();
      if (meta.titleGuessed) {
        const fromLine = parseFileName(`${firstText}.txt`);
        if (!fromLine.titleGuessed && fromLine.title) title = fromLine.title;
      }
    }
  }

  if (meta.titleGuessed && title === meta.title) {
    const firstHeading = blocks.find((b) => b.type === "heading");
    const candidate = firstHeading ? nodeText(firstHeading).trim() : "";
    if (candidate && candidate.length <= 80 && !/^(einleitung|hauptteil|schluss|gebet|text)$/i.test(candidate)) title = candidate;
  }

  return { content: { ...content, content: blocks.length ? blocks : [{ type: "paragraph" }] }, title };
}
