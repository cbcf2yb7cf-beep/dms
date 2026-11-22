import type { JSONNode } from "@/lib/content";
import { doc, heading, list, paragraph, text } from "./blocks";

// Reiner Text (alte .doc-Dateien, RTF, TXT, PDF) → Tiptap-JSON.
// Erkennt Gliederungszeilen wie "Einleitung:" oder "HAUPTTEIL" und Aufzählungen mit "-", "•", "1.".

const BULLET = /^\s*[-–•*·]\s+/;
const NUMBERED = /^\s*\d{1,2}[.)]\s+/;

function headingLevel(line: string): number | null {
  const s = line.trim();
  if (s.length < 3 || s.length > 60) return null;
  const letters = s.replace(/[^\p{L}]/gu, "");
  if (letters.length < 3) return null;
  // "Einleitung:", "Hauptteil:", "Textthema:" (höchstens 4 Wörter)
  if (/:$/.test(s) && s.split(/\s+/).length <= 4) return 2;
  // "EINLEITUNG", "HAUPTTEIL" – kurze Zeile ganz in Großbuchstaben
  if (letters === letters.toUpperCase() && !/[.!?,;]$/.test(s) && s.split(/\s+/).length <= 8) return 2;
  return null;
}

export function textToDoc(raw: string): JSONNode {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "") // Steuerzeichen aus Word
    .replace(/\t/g, " ")
    .split("\n");

  const out: JSONNode[] = [];
  let listKind: "bullet" | "ordered" | null = null;
  let items: JSONNode[][] = [];
  const flushList = () => {
    if (listKind && items.length) out.push(list(listKind === "ordered", items));
    listKind = null;
    items = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) {
      flushList();
      continue;
    }
    const kind = BULLET.test(rawLine) ? "bullet" : NUMBERED.test(rawLine) ? "ordered" : null;
    if (kind) {
      if (listKind !== kind) flushList();
      listKind = kind;
      items.push([paragraph([text(line.replace(kind === "bullet" ? BULLET : NUMBERED, "").trim() || line)])]);
      continue;
    }
    flushList();
    const level = headingLevel(line);
    out.push(level ? heading(level, line.replace(/:$/, "")) : paragraph([text(line)]));
  }
  flushList();
  return doc(out);
}
